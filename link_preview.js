/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// SETTINGS の確認
if (typeof SETTINGS === 'undefined') {
    console.error("[console()]SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("[console()]SETTINGS が正しく読み込まれました:", SETTINGS);
}

debugLog("link_preview.js is loaded");

// グローバルスコープで preview_frame と preview_icon を定義
let preview_frame;
let preview_icon;

// マウスオーバー時の処理
function on_link_mouseover_doc(event) {
    if (!SETTINGS.previewEnabled.value) return;
    preview_frame._onLinkMouseOver(event);
}

// マウスアウト時の処理
function on_link_mouseout_doc(event) {
    if (!preview_frame) {
        debugLog("preview_frame が未定義のため、on_link_mouseout_doc をスキップします");
        return;
    }

    if (event.target.nodeName === 'A') {
        preview_frame._setPreviewState({ currentHoveredUrl: null }); // マウスアウト時に現在のURLをリセット
        if (preview_frame.display) {
            preview_frame.hide();
        }
    }
}

// メッセージリスナーを追加

// PreviewFrame クラス
class PreviewFrame {
    constructor() {
        this._display = false;
        this.frame = this.build_frame();
        this.iframe = this.frame.querySelector('#lprv_content');

        // previewState オブジェクトで URL の状態を管理
        this.previewState = {
            currentHoveredUrl: null, // 現在マウスオーバーしているURL
            pendingUrl: null, // 更新タイマーがスタートする時点でのURL
            previewShowPageUrl: null, // プレビュー画面が表示しているURL（埋め込みURLに変換前）
            lastHoveredUrl: null // 直前にマウスオーバーしたURL
        };

        // プレビューのロック状態
        this.locked = SETTINGS.keepPreviewFrameOpen.value || false;

        // タイマーの初期化
        this.show_timer = new Timer((url) => this._show(url), SETTINGS.frameDisplayDelay.value);
        this.hide_timer = new Timer(this._hide.bind(this), SETTINGS.frameDisplayTime.value);
        this.update_timer = new Timer((url) => this._update(url), SETTINGS.frameUpdateTime.value);

        // ロックピンの状態を更新
        this._updatePinButtonState();
    }

    // previewState のプロパティを設定するメソッド
    _setPreviewState({ currentHoveredUrl = null, pendingUrl = null, previewShowPageUrl = null, lastHoveredUrl = null } = {}) {
        if (currentHoveredUrl !== null) this.previewState.currentHoveredUrl = currentHoveredUrl;
        if (pendingUrl !== null) this.previewState.pendingUrl = pendingUrl;
        if (previewShowPageUrl !== null) this.previewState.previewShowPageUrl = previewShowPageUrl;
        if (lastHoveredUrl !== null) this.previewState.lastHoveredUrl = lastHoveredUrl;
    }

    // 更新タイマー経過前後でマウスオーバーしているURLに変更がないかをチェック
    _isPendingUrlSameAsCurrentHovered() {
        return this.previewState.pendingUrl === this.previewState.currentHoveredUrl;
    }

    // マウスオーバーしているURLとプレビュー画面が表示しているURLが同じかをチェック
    _isCurrentHoveredUrlSameAsPreviewShowUrl() {
        return this.previewState.currentHoveredUrl === this.previewState.previewShowPageUrl;
    }

    // URLがフィルタリストに一致するかを判定
    _shouldIgnoreUrl(url) {
        const filterList = SETTINGS.urlFilterList.value || [];
        for (const filter of filterList) {
            if (url.includes(filter)) {
                debugLog(`URL がフィルタリストに一致しました: ${filter}`);
                return true;
            }
        }
        return false;
    }

    // 短縮URLかどうかを判定
    _isShortenedUrl(url) {
        const shortenedUrlDomains = SETTINGS.shortenedUrlDomains.value ?? SETTINGS.shortenedUrlDomains.default;

        try {
            const urlObj = new URL(url);
            return shortenedUrlDomains.some(domain => urlObj.hostname.includes(domain));
        } catch (error) {
            debugLog("URLの解析中にエラーが発生しました:", error);
            return false;
        }
    }

    // YouTubeのURLを判定し、埋め込みURLを生成
    _handleYouTubeUrl(url) {
        // 既に埋め込み型のYouTube URLの場合は null を返す
        if (url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/[^?]+/)) {
            debugLog("既に埋め込み型のYouTube URLです:", url);
            return null;
        }

        // 通常のYouTube URLを埋め込み型に変換
        const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/) ||
            url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/);

        if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            debugLog("YouTube動画IDを検出しました:", videoId);

            // YouTube自動再生設定を取得
            const autoplayEnabled = SETTINGS.youtubeAutoplay.value ?? SETTINGS.youtubeAutoplay.default;

            // autoplay=1 を追加するかどうかを制御
            return `https://www.youtube.com/embed/${videoId}${autoplayEnabled ? "?autoplay=1" : ""}`;
        }

        // YouTubeライブURLを埋め込み型に変換
        const liveUrlMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([\w-]+)/);
        if (liveUrlMatch) {
            const liveVideoId = liveUrlMatch[1];
            debugLog("YouTubeライブ動画IDを検出しました:", liveVideoId);

            // autoplay=1 を追加するかどうかを制御
            const autoplayEnabled = SETTINGS.youtubeAutoplay.value ?? SETTINGS.youtubeAutoplay.default;

            return `https://www.youtube.com/embed/${liveVideoId}${autoplayEnabled ? "?autoplay=1" : ""}`;
        }

        /*  shorts動画は45秒で再生が止まる問題がないので通常のURL開く        
                // YouTube Shorts URLを埋め込み型に変換
                const shortsUrlMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([\w-]+)/);
                if (shortsUrlMatch) {
                    const shortsVideoId = shortsUrlMatch[1];
                    debugLog("YouTube Shorts動画IDを検出しました:", shortsVideoId);
        
                    // autoplay=1 を追加するかどうかを制御
                    const autoplayEnabled = SETTINGS.youtubeAutoplay.value ?? SETTINGS.youtubeAutoplay.default;
        
                    return `https://www.youtube.com/embed/${shortsVideoId}${autoplayEnabled ? "?autoplay=1" : ""}`;
                }
        */
        return null; // YouTube URLでない場合は null を返す
    }

    // マウスオーバー時の処理
    async _onLinkMouseOver(event) {
        const linkElement = event.target.closest('a');
        if (!linkElement || !linkElement.href) {
            debugLog("マウスオーバーした要素が<a>タグではないため、currentHoveredUrl をリセットします:", event.target.nodeName);
            this._setPreviewState({ currentHoveredUrl: null });
            return;
        }

        let url = linkElement.href;

        // 短縮URLを展開
        if (this._isShortenedUrl(url)) {
            debugLog("短縮URLを検出しました。展開を試みます:", url);
            url = await resolveShortenedUrl(url);
            debugLog("展開されたURL:", url);
        }

        // 直前のURLと同じ場合でかつアイコンが表示されているときは何もしない
        if (preview_icon.isVisible() && this.previewState.lastHoveredUrl === url) {
            debugLog("同じURLにマウスオーバーしています。アイコンを再表示しません:", url);
            return;
        }

        // URLがフィルタリストに一致する場合は処理をスキップ
        if (this._shouldIgnoreUrl(url)) {
            debugLog("この URL はフィルタリストに一致するため、currentHoveredUrl をリセットします:", url);
            this._setPreviewState({ currentHoveredUrl: null });
            return;
        }

        // 以降の処理を実行
        this._setPreviewState({ lastHoveredUrl: url }); // 直前のURLを更新
        this._setPreviewState({ currentHoveredUrl: url });
        debugLog("currentHoveredUrl を更新しました:", this.previewState.currentHoveredUrl);

        // プレビュー画面が表示されている場合は更新処理を実行
        if (this.display) {
            this.update(url);
        } else {
            // プレビュー画面が表示されていない場合はアイコンを表示
            preview_icon.show(url, event.clientX, event.clientY);
        }
    }

    _updatePinButtonState() {
        const pinButton = this.frame.querySelector('#push-pin');
        if (this.locked) {
            pinButton.setAttribute('locked', 'yes');
        } else {
            pinButton.removeAttribute('locked');
        }
        debugLog("ピンボタンの状態を更新しました:", this.locked);
    }

    get display() {
        return this._display;
    }

    _applyRightMargin() {
        const currentDomain = window.location.hostname;
        let targetElement = document.body; // デフォルトは body

        // カスタムマージン設定を確認
        for (const entry of SETTINGS.customMarginSelectors.value) {
            const [domain, selector] = entry.split(",").map(s => s.trim());
            if (currentDomain.includes(domain)) {
                const customElement = document.querySelector(selector);
                if (customElement) {
                    targetElement = customElement;
                    debugLog(`カスタムマージン設定が適用されました: ${domain}, ${selector}`);
                    break;
                }
            }
        }

        // 右マージンを適用
        targetElement.style.marginRight = `${SETTINGS.bodyRightMarginWidthPx.value}px`;
    }

    show(url) {
        this._setPreviewState({ pendingUrl: url });
        this.show_timer.start(url);
        this.hide_timer.stop();
    }

    // 実際にプレビューを表示
    async _show(url) {
        this._applyRightMargin(); // プレビュー表示時に右マージンを適用
        this._display = true;
        debugLog("プレビューを表示します:", url);

        // 短縮URLをバックグラウンドで展開
        //        const resolvedUrl = await resolveShortenedUrl(url);
        //        debugLog("展開されたURL:", resolvedUrl);
        const resolvedUrl = url; // 短縮URLの展開をスキップ

        // YouTubeのURLを埋め込みURLに変換
        const embedUrl = this._handleYouTubeUrl(resolvedUrl);
        const finalUrl = embedUrl || resolvedUrl;

        // iframeのURLを更新
        this.iframe.src = finalUrl;
        this.frame.style.visibility = 'visible';

        this._setPreviewState({ previewShowPageUrl: resolvedUrl }); // プレビュー画面に表示するURLを格納

        /*  //resolveShortenedUrl() の実装により、iframe にスクリプトを挿入して開いているページのURLを送信する必要がなくなったため、以下のコードはコメントアウトしています。
                // メッセージリスナーを設定
                const messageHandler = (event) => {
                    // メッセージの種類を確認
                    if (event.data.type === "iframeUrl") {
                        const openedUrl = event.data.url;
                        debugLog("iframe 内で実際に開かれているURL:", openedUrl);
        
                        // 実際のURLを_handleYouTubeUrlでチェック
                        const newEmbedUrl = this._handleYouTubeUrl(openedUrl);
                        if (newEmbedUrl) {
                            debugLog("埋め込み型のYouTube URLに変換して再度プレビューを表示します:", newEmbedUrl);
                            this._show(newEmbedUrl); // 再コール
                        }
        
                        // メッセージリスナーを削除
                        window.removeEventListener("message", messageHandler);
                    }
                };
        
                // メッセージリスナーを追加
                window.addEventListener("message", messageHandler);
        */
    }

    // プレビューを非表示
    hide() {
        debugLog("hide() called. Current locked state:", this.locked);

        if (!SETTINGS.previewEnabled.value) {
            debugLog("プレビュー機能がOFFのため、非表示にします");
            this._hide(); // プレビュー機能がOFFになっている場合はタイマーを使わずに即座に非表示にする
            this.show_timer.stop();
            this.update_timer.stop();
        } else if (!this.locked) {
            debugLog("プレビューがロックされていないため、非表示にします");
            this.hide_timer.start();
            this.show_timer.stop();
            this.update_timer.stop();
        } else {
            debugLog("プレビューがロックされているため、非表示にしません");
        }
    }

    // 実際にプレビューを非表示
    _hide() {
        this._display = false;
        debugLog("プレビューを非表示にします");
        this.iframe.src = "about:blank";
        this.frame.style.visibility = 'hidden';

        // プレビューを非表示にした際に右マージンをリセット
        const currentDomain = window.location.hostname;
        let targetElement = document.body;

        for (const entry of SETTINGS.customMarginSelectors.value) {
            const [domain, selector] = entry.split(",").map(s => s.trim());
            if (currentDomain.includes(domain)) {
                const customElement = document.querySelector(selector);
                if (customElement) {
                    targetElement = customElement;
                    break;
                }
            }
        }

        targetElement.style.marginRight = '0';
    }

    // プレビューを更新
    update(url) {
        // プレビュー画面に表示されているURLと同じ場合は何もしない
        if (this._isCurrentHoveredUrlSameAsPreviewShowUrl()) {
            debugLog("プレビュー画面にすでに表示されているURLのため、更新をスキップします:", url);
            return;
        }

        this._setPreviewState({ pendingUrl: url });
        this.hide_timer.stop(); // 非表示タイマーを停止
        debugLog("更新間隔タイマーを開始します:", url);
        this.update_timer.start(url);
    }

    // 実際にプレビューを更新
    _update(url) {
        debugLog("更新間隔タイマーが終了しました。プレビューを更新します:", url);

        // マウスポインタがプレビュー画面上にある場合は更新をスキップ
        if (this.frame.matches(':hover')) {
            debugLog("マウスポインタがプレビュー画面上にあるため、URLの更新をスキップします:", url);
            return;
        }

        // 更新時間経過後にマウスオーバーしているURLと一致している場合のみ更新
        if (this._isPendingUrlSameAsCurrentHovered()) {
            debugLog("更新時間経過前後でマウスオーバーしているURLが一致しているのでプレビューを更新します:", url);

            this._show(url); // プレビューを表示
        } else {
            debugLog("更新時間経過前後でURLが一致しなかったため、更新をスキップします:", url);

            // currentHoveredUrl が有効な URL の場合、再度 update() を呼び出す
            if (this.previewState.currentHoveredUrl) {
                debugLog("マウスポインタが移動後にURLをマウスオーバーしているので再度更新を試みます:", this.previewState.currentHoveredUrl);
                this.update(this.previewState.currentHoveredUrl);
            }
        }
        this.hide(); // 更新後に非表示タイマーを開始
    }

    build_frame() {
        let frame = document.createElement("div");
        frame.setAttribute("id", "lprv_frame");
        frame.style.visibility = 'hidden';
        frame.innerHTML = `
          <div class="lprv_toolbar">
            <div id="logo"></div>
            <div class="lprv_btn_group">
              <button class="lprv_btn" id="back" title="Back"></button>
              <button class="lprv_btn" id="forward" title="Forward"></button>
            </div>
            <div class="lprv_btn_group">
              <button class="lprv_btn" id="open_tab" title="Open in new tab"></button>
            </div>
            <div class="lprv_btn_group" id="pin">
              <button class="lprv_btn" id="push-pin" title="Keep preview frame open"></button>
              <button class="lprv_btn" id="hide" title="Hide preview frame"></button>
            </div>
          </div>
          <iframe id="lprv_content" sandbox="allow-scripts allow-same-origin"></iframe>
        `;

        // プレビューウィンドウの幅を設定
        frame.style.width = `${SETTINGS.previewWidthPx.value}px`;

        /* resolveShortenedUrl() の実装により、iframe にスクリプトを挿入して開いているページのURLを送信する必要がなくなったため、以下のコードはコメントアウトしています。
        // iframe の onload イベントを設定
        const iframe = frame.querySelector('#lprv_content');
        iframe.onload = () => {
            try {
                // iframe.contentDocument が利用可能か確認
                if (iframe.contentDocument) {
                    // iframe 内のページで現在のURLを親ウィンドウに送信するスクリプトを挿入
                    const script = `
                        window.addEventListener("load", () => {
                            const currentUrl = window.location.href;
                            window.parent.postMessage({ type: "iframeUrl", url: currentUrl }, "*");
                            console.log("メッセージを送信:", { type: "iframeUrl", url: currentUrl });
                        });
                    `;
                    const scriptElement = iframe.contentDocument.createElement("script");
                    scriptElement.textContent = script;
                    iframe.contentDocument.body.appendChild(scriptElement);
                } else {
                    console.error("iframe.contentDocument にアクセスできません。sandbox 属性を確認してください。");
                }
            } catch (error) {
                console.error("iframe のスクリプト挿入中にエラーが発生しました:", error);
            }
        };
*/


        frame.querySelector('#back').addEventListener("click", this._on_nav_back_click.bind(this));
        frame.querySelector('#forward').addEventListener("click", this._on_nav_forward_click.bind(this));
        frame.querySelector('#open_tab').addEventListener("click", this._on_open_tab_click.bind(this));
        frame.querySelector('#push-pin').addEventListener("click", this._on_push_pin_click.bind(this));
        frame.querySelector('#hide').addEventListener("click", this._on_hide_click.bind(this));

        document.body.appendChild(frame);
        frame.addEventListener("mouseenter", this._on_mouseover.bind(this));
        frame.addEventListener("mouseleave", this._on_mouseout.bind(this));
        return frame;
    }

    _on_nav_back_click(e) {
        debugLog("戻るボタンがクリックされました");
        window.history.back();
    }
    _on_nav_forward_click() {
        debugLog("進むボタンがクリックされました");
        window.history.forward();
    }
    _on_open_tab_click() {
        const url = this.iframe.contentWindow.location.href;
        debugLog("新しいタブで開きます:", url);
        let win = window.open(url, '_blank');
        win.focus();
    }
    _on_push_pin_click(e) {
        let btn = e.target;
        this.locked = !this.locked; // ロック状態を切り替え
        debugLog("プレビューの固定状態を切り替えました:", this.locked);

        // ボタンの状態を更新
        if (this.locked) {
            btn.setAttribute('locked', 'yes');
        } else {
            btn.removeAttribute('locked');
        }

        // SETTINGS にロック状態を反映（ただし、他のタブには影響を与えない）
        SETTINGS.keepPreviewFrameOpen.value = this.locked;

        // ローカルストレージにロック状態を保存
        browser.storage.local.set({ "keepPreviewFrameOpen": this.locked }).then(() => {
            debugLog("ローカルストレージにロック状態を保存しました:", this.locked);
        });

        // ピンボタンの状態を更新
        this._updatePinButtonState();
    }
    _on_hide_click(e) {
        debugLog("非表示ボタンがクリックされました");
        this._hide();
    }
    _on_mouseover(e) {
        this.hide_timer.stop();
    }
    _on_mouseout(e) {
        this.hide();
    }
}

class Timer {
    constructor(func, timeout) {
        this.func = func;       // タイマーが終了したときに実行する関数
        this.timeout = timeout; // タイムアウト時間（ミリ秒）
        this.timer = null;      // 現在のタイマーIDを保持
        this.running = false;   // タイマーが動作中かどうかを示すフラグ
    }

    start(arg = null) {
        // 既存のタイマーが動作中の場合はキャンセル
        if (this.running) {
            clearTimeout(this.timer);
        }

        // 新しいタイマーを開始
        this.timer = setTimeout(() => this._exec(arg), this.timeout);
        this.running = true; // タイマーが動作中であることを記録
    }

    _exec(arg) {
        this.func(arg);      // 指定された関数を引数付きで実行
        this.running = false; // タイマーが終了したことを記録
        this.timer = null;    // タイマーIDをリセット
    }

    stop() {
        // 動作中のタイマーを停止
        if (this.running) {
            clearTimeout(this.timer);
            this.running = false; // タイマーが停止したことを記録
            this.timer = null;    // タイマーIDをリセット
        }
    }

    updateTimeout(newTimeout) {
        this.timeout = newTimeout; // タイムアウト時間を更新
    }
}

class PreviewIcon {
    constructor() {
        this.show_timer = new Timer(this._show.bind(this), SETTINGS.iconDisplayDelay.value);
        this.hide_timer = new Timer(this._hide.bind(this), SETTINGS.iconDisplayTime.value);
        this.icon = this.build_icon();
        this.polygon = null; // ポリゴン要素を保持するプロパティ
        this.urlForPreview = null; // 表示するリンクの URL を保持
        this.mousePosition = { x: 0, y: 0 }; // マウスポインタの位置を保持
        this.isMouseOverIcon = false; // アイコン上にマウスオーバーしているかを追跡

        // マウスの動きを追跡
        document.addEventListener("mousemove", (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        });

        // 初期アイコンサイズを設定
        this.updateIconSize();
    }

    updateIconSize() {
        const sizeMap = {
            small: "16px",
            medium: "24px",
            large: "32px"
        };
        const size = sizeMap[SETTINGS.iconSize.value] || sizeMap.small;
        this.icon.style.width = size;
        this.icon.style.height = size;
        debugLog("アイコンの大きさを更新しました:", size);
    }

    show(url) {
        // アイコン上にマウスオーバーしている場合は新しいアイコンを表示しない
        if (this.isMouseOverIcon) {
            debugLog("アイコン上にマウスオーバーしているため、新しいアイコンを表示しません");
            return;
        }

        // 新しい URL をマウスオーバーした場合、既存のアイコンを非表示タイマーで消す
        if (this.urlForPreview !== url) {
            this.hide_timer.start(); // 一定時間後に消す
        }

        this.urlForPreview = url;
        this.show_timer.stop();
        this.show_timer.start();
    }

    hide() {
        this.icon.style.visibility = 'hidden';
        this.hide_timer.stop();
    }

    _show() {
        // 遅延後に保存された最新のマウスポインタ位置を使用
        const posX = this.mousePosition.x;
        const posY = this.mousePosition.y;

        // アイコンを表示する位置を計算
        const pos = this._getIconPosition(posX, posY);
        this.icon.style.left = pos.x + "px";
        this.icon.style.top = pos.y + "px";
        this.icon.style.visibility = "visible";
        this.icon.style.pointerEvents = "auto"; // アイコン部分のみポインターイベントを有効にする
        this.icon.style.zIndex = "9999";
        debugLog("アイコンのスタイル:", this.icon.style);
        this.hide_timer.start(); // 表示後に非表示タイマーを開始

        // ポリゴンイベントリスナーを再設定
        if (this.polygon) {
            this.polygon.addEventListener("mouseover", this._on_mouseover.bind(this));
            this.polygon.addEventListener("mouseout", this._on_mouseout.bind(this));
        }
    }

    _hide() {
        this.icon.style.visibility = "hidden";
        this.icon.style.pointerEvents = "none"; // 非表示時はポインターイベントを無効にする

        // ポリゴンイベントリスナーを削除
        if (this.polygon) {
            this.polygon.removeEventListener("mouseover", this._on_mouseover.bind(this));
            this.polygon.removeEventListener("mouseout", this._on_mouseout.bind(this));
        }
    }

    build_icon() {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("id", "link_preview_icon");

        // サイズごとのピクセル値を設定
        const sizeMap = {
            small: 16, // 16px
            medium: 24, // 24px
            large: 32  // 32px
        };

        // 現在のアイコンサイズを取得
        const currentSize = SETTINGS.iconSize.value || "small";
        const pixelSize = sizeMap[currentSize] || sizeMap.small;

        // SVGのサイズを設定
        svg.setAttribute("width", pixelSize);
        svg.setAttribute("height", pixelSize);
        svg.setAttribute("viewBox", `0 0 ${pixelSize} ${pixelSize}`);
        svg.style.visibility = "hidden";
        svg.style.position = "absolute";

        // 頂点リスト（修正後）
        const pointsMap = {
            small: "1,6 1,9 7,15 15,9 15,5 9,2", // 16px
            medium: "1,7 1,11 9,19 20,11 20,7 11,2", // 24px
            large: "1,11 1,17 14,29 30,17 30,10 17,3" // 32px
        };

        const points = pointsMap[currentSize];

        // ポインターイベントを制御するためのポリゴン
        const bi_polygon = document.createElementNS(svgNS, "polygon");
        bi_polygon.setAttribute("points", points);
        bi_polygon.setAttribute("fill", "transparent"); // 背景を透明に設定
        bi_polygon.style.pointerEvents = "auto"; // ポリゴン内のみポインターイベントを有効にする

        // 実際のアイコン部分（画像）
        const iconImage = document.createElementNS(svgNS, "image");
        const iconPath = browser.runtime.getURL("images/mouseover.png");
        iconImage.setAttribute("href", iconPath);
        iconImage.setAttribute("x", "0");
        iconImage.setAttribute("y", "0");
        iconImage.setAttribute("width", pixelSize.toString());
        iconImage.setAttribute("height", pixelSize.toString());
        iconImage.style.pointerEvents = "none"; // 画像自体のポインターイベントを無効にする

        // SVGに要素を追加
        svg.appendChild(iconImage);
        svg.appendChild(bi_polygon);

        // デバッグモードが有効の場合は赤い枠線を表示
        if (SETTINGS.debugMode && SETTINGS.debugMode.value === true) {
            // 赤い枠線を表示するためのポリゴン
            const debugPolygon = document.createElementNS(svgNS, "polygon");
            debugPolygon.setAttribute("points", points);
            debugPolygon.setAttribute("fill", "transparent");
            debugPolygon.setAttribute("stroke", "red"); // 赤い枠線
            debugPolygon.setAttribute("stroke-width", "1"); // 枠線の太さ
            debugPolygon.style.pointerEvents = "none"; // ポインターイベントには反応しない

            svg.appendChild(debugPolygon);
            debugLog("デバッグモード有効: アイコンの反応範囲を赤枠で表示しています");
        }

        document.body.appendChild(svg);


        this.polygon = bi_polygon; // ポリゴン要素を保存
        // イベントリスナーの設定
        this.polygon.addEventListener("mouseover", this._on_mouseover.bind(this));
        this.polygon.addEventListener("mouseout", this._on_mouseout.bind(this));

        return svg;
    }

    _getIconPosition(cursorX, cursorY) {
        const posX = cursorX + SETTINGS.iconDisplayOffsetX.value + window.scrollX;
        const posY = cursorY + SETTINGS.iconDisplayOffsetY.value + window.scrollY;
        return { x: posX, y: posY };
    }

    _on_mouseover(e) {
        this.isMouseOverIcon = true; // フラグを true に設定
        this.hide_timer.stop();
        preview_frame.show(this.urlForPreview);
    }

    _on_mouseout(e) {
        this.isMouseOverIcon = false; // フラグを false に設定
        this.hide_timer.start();
        preview_frame.hide();
    }

    isVisible() {
        return this.icon.style.visibility === "visible";
    }
}






// 短縮URLを展開する関数
async function resolveShortenedUrl(shortUrl) {
    return new Promise((resolve) => {
        const req = new XMLHttpRequest();
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                const contentType = req.getResponseHeader("Content-Type");
                if (contentType === null) {
                    console.warn("展開できません:", shortUrl);
                    resolve(shortUrl);
                } else if (!/text\/html/.test(contentType)) {
                    if (/image\//.test(contentType)) {
                        console.log("画像です:", shortUrl);
                        resolve(shortUrl);
                    } else if (/json/.test(contentType)) {
                        console.log("JSONです:", shortUrl);
                        resolve(shortUrl);
                    } else {
                        console.log(contentType + " 形式のデータです:", shortUrl);
                        resolve(shortUrl);
                    }
                } else if (req.status === 304 || req.status === 200) {
                    // レスポンスボディからURLを抽出
                    const responseText = req.responseText;
                    const urlMatch = responseText.match(/https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g);
                    if (urlMatch && urlMatch.length > 0) {
                        const finalUrl = urlMatch[0]; // 最初にマッチしたURLを使用
                        debugLog("展開されたURL(resolveShortenedUrl):", finalUrl);
                        resolve(finalUrl);
                    } else {
                        console.warn("レスポンスからURLを抽出できませんでした:", shortUrl);
                        resolve(shortUrl);
                    }
                } else {
                    console.warn("展開できません:", shortUrl);
                    resolve(shortUrl);
                }
            }
        };

        try {
            req.open('GET', shortUrl, true);
            req.send();
        } catch (error) {
            console.error("リクエスト中にエラーが発生しました:", error);
            resolve(shortUrl);
        }
    });
}

// SETTINGS変数が更新されたときの更新処理をまとめた関数(ページロード時も実行)
async function updatePreviewSettings() {
    // タイマーのタイムアウト値を更新
    preview_icon.show_timer.updateTimeout(SETTINGS.iconDisplayDelay.value);
    preview_icon.hide_timer.updateTimeout(SETTINGS.iconDisplayTime.value);
    preview_frame.show_timer.updateTimeout(SETTINGS.frameDisplayDelay.value);
    preview_frame.hide_timer.updateTimeout(SETTINGS.frameDisplayTime.value);
    preview_frame.update_timer.updateTimeout(SETTINGS.frameUpdateTime.value);

    // プレビューウィンドウの幅を再設定
    if (preview_frame.frame) {
        preview_frame.frame.style.width = `${SETTINGS.previewWidthPx.value}px`;
    }

    // プレビューウィンドウが表示されている場合、右マージンを更新
    if (preview_frame.display) {
        preview_frame._applyRightMargin(); // _applyRightMargin を呼び出す
    }

    // アイコンを再生成（デバッグモードの変更を反映するため）
    if (preview_icon.icon) {
        document.body.removeChild(preview_icon.icon);
        preview_icon.icon = preview_icon.build_icon();
    }

    // アイコンの大きさを更新
    preview_icon.updateIconSize();

    debugLog("プレビュー設定が反映されました:", SETTINGS);
}



// プレビューインスタンスを初期化する関数
function initializePreviewInstances() {

    if (SETTINGS.previewEnabled.value) {
        debugLog("PreviewFrame と PreviewIcon のインスタンスを作成します");
        preview_frame = new PreviewFrame();
        preview_icon = new PreviewIcon();

        updatePreviewSettings(); // プレビュー設定を更新

        // マウスイベントリスナーを登録
        document.addEventListener('mouseover', on_link_mouseover_doc);
        document.addEventListener('mouseout', on_link_mouseout_doc);
    }
}

// プレビューインスタンスを削除する関数
function destroyPreviewInstances() {
    if (preview_frame) {
        preview_frame._hide();
        preview_frame = null;
    }
    if (preview_icon) {
        preview_icon.hide();
        preview_icon = null;
    }
    // マウスイベントリスナーを削除
    document.removeEventListener('mouseover', on_link_mouseover_doc);
    document.removeEventListener('mouseout', on_link_mouseout_doc);

}



async function initialize() {
    await loadSettings().then(() => {
        debugLog("設定がロードされました:", SETTINGS);
        // プレビュー機能ONOFFフラグが未定義の場合、デフォルト値を設定
        if (SETTINGS.previewEnabled.value === undefined) {
            SETTINGS.previewEnabled.value = SETTINGS.previewEnabled.default;
            browser.storage.local.set({ "previewEnabled": SETTINGS.previewEnabled.default });
        }
        initializePreviewInstances(); // プレビューインスタンスを初期化
    });

    // メッセージリスナーを追加
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        try {
            switch (message.action) {
                case "updatePreviewEnabled":
                    debugLog("updatePreviewEnabled メッセージを受信しました:", message.enabled);
                    await loadSettings(); // 設定をロード
                    SETTINGS.previewEnabled.value = message.enabled;
                    debugLog("プレビュー機能の状態が更新されました:", message.enabled);

                    if (message.enabled) {
                        // プレビュー機能がONの場合
                        debugLog("プレビュー機能がONになりました。インスタンスを作成します。");
                        initializePreviewInstances();
                    } else {
                        // プレビュー機能がOFFの場合
                        debugLog("プレビュー機能がOFFになりました。インスタンスを削除します。");
                        destroyPreviewInstances();
                    }

                    // レスポンスを返す
                    sendResponse({ success: true });
                    break;

                default:
                    debugLog("未対応のメッセージアクション:", message.action);
                    sendResponse({ success: false, error: "Unsupported action" });
            }
        } catch (error) {
            debugLog("onMessage リスナー内でエラーが発生しました:", error);
            sendResponse({ success: false, error: error.message });
        }

        // 非同期処理が完了するまで待機することを示す
        return true;
    });

    // 設定が変更されたときに再読み込み
    browser.storage.onChanged.addListener(async (changes, area) => {
        if (area === "local") {
            await loadSettings().then(() => {
                updatePreviewSettings();

                // 変更された設定値を1つのオブジェクトにまとめる
                const changedSettings = {};
                for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
                    changedSettings[key] = { oldValue, newValue };
                }

                // まとめてメッセージを送信
                browser.runtime.sendMessage({
                    action: "settingsChanged",
                    changes: changedSettings
                }).catch((error) => {
                    debugLog("メッセージ送信中にエラーが発生しました:", error);
                });
            });
        }
    });

    // ページが更新されたときにプレビューインスタンスを再初期化
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) { // ページがキャッシュから復元された場合
            debugLog("ページがキャッシュから復元されました。プレビューインスタンスを再初期化します。");
            initializePreviewInstances();
        } else {
            debugLog("ページが通常のロードで表示されました。プレビューインスタンスを再初期化します。");
            initializePreviewInstances();
        }
    });
}

// 初期化関数を呼び出す
initialize();
