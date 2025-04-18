/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

if (typeof SETTINGS === 'undefined') {
    console.error("[console()]SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("[console()]SETTINGS が正しく読み込まれました:", SETTINGS);
}

debugLog("link_preview.js is loaded");

// グローバルスコープで preview_frame と preview_icon を定義
let preview_frame;
let preview_icon;

// 関数定義部分を上部に移動
function on_link_mouseover_doc(event) {
    if (!SETTINGS.previewEnabled.value) return;

    preview_frame._onLinkMouseOver(event);
}

function on_link_mouseout_doc(event) {
    if (!preview_frame) {
        debugLog("preview_frame が未定義のため、on_link_mouseout_doc をスキップします");
        return;
    }

    if (event.target.nodeName == 'A') {
        preview_frame.currentHoveredUrl = null; // マウスアウト時に現在のURLをリセット
        if (preview_frame.display) {
            preview_frame.hide();
        }
    }
}

// メッセージリスナーを追加
browser.runtime.onMessage.addListener((message) => {
    switch (message.action) {
        case "updatePreviewEnabled":
            debugLog("updatePreviewEnabled メッセージを受信しました:", message.enabled);
            loadSettings(); // 設定をロード
            SETTINGS.previewEnabled.value = message.enabled;
            debugLog("プレビュー機能の状態が更新されました:", message.enabled);

            // プレビュー機能がOFFの場合、表示中のプレビューを非表示にする
            if (!message.enabled && preview_frame.display) {
                preview_frame._hide();
            }
            break;

        default:
            debugLog("未対応のメッセージアクション:", message.action);
    }
});

// PreviewFrame クラスの定義を先頭に移動
class PreviewFrame {
    constructor() {
        this._display = false;
        this.frame = this.build_frame();
        this.iframe = this.frame.querySelector('#lprv_content');

        // SETTINGS を使用してロック状態を設定
        this.locked = SETTINGS.keepPreviewFrameOpen.value || false;
        this._updatePinButtonState(); // ピンボタンの状態を更新

        this.pendingUrl = null; // 更新間隔中のURL
        this.currentHoveredUrl = null; // 現在マウスオーバーしているURL
        this.show_timer = new Timer(this._show.bind(this), SETTINGS.frameDisplayDelay.value);
        this.hide_timer = new Timer(this._hide.bind(this), SETTINGS.frameDisplayTime.value);
        this.update_timer = new Timer((url) => this._update(url), SETTINGS.frameUpdateTime.value);
    }

    _shouldIgnoreUrl(url) {
        // URL フィルタリストを取得
        const filterList = SETTINGS.urlFilterList.value || []; // 配列形式で保持されている

        // フィルタリストに一致する文字列が含まれている場合は true を返す
        for (const filter of filterList) {
            if (url.includes(filter)) {
                debugLog(`URL がフィルタリストに一致しました: ${filter}`);
                return true;
            }
        }

        return false;
    }

    /**
     * YouTubeのURLかどうかを判定し、埋め込みプレーヤーのURLを生成して表示する
     * @param {string} url - チェックするURL
     * @returns {boolean} - YouTubeのURLだった場合はtrue、それ以外はfalse
     */
    _handleYouTubeUrl(url) {
        const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/) ||
                             url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/);

        if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            debugLog("YouTube動画IDを検出しました:", videoId);

            // YouTube埋め込みプレーヤーを表示
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            this.show(embedUrl);
            return true;
        }

        return false;
    }

    _onLinkMouseOver(event) {
        const linkElement = event.target.closest('a');
        if (!linkElement || !linkElement.href) {
            debugLog("マウスオーバーした要素が<a>タグではないため、プレビューを表示しません:", event.target.nodeName);
            this.currentHoveredUrl = null;
            return;
        }

        const url = linkElement.href;

        // URL がフィルタリストに一致する場合は処理をスキップ
        if (this._shouldIgnoreUrl(url)) {
            debugLog("この URL はフィルタリストに一致するため、プレビューを表示しません:", url);
            return;
        }

        this.currentHoveredUrl = url;

        // YouTubeのURLだった場合の処理
        if (this._handleYouTubeUrl(url)) {
            return; // YouTubeのURLだった場合は処理を終了
        }

        // 通常のプレビューを表示
        if (this.display) {
            this.update(url);
        } else {
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
        this.url = url;
        this.show_timer.start();
        this.hide_timer.stop();
    }

    _show() {
        this._applyRightMargin(); // プレビュー表示時に右マージンを適用
        this._display = true;

        debugLog("プレビューを表示します:", this.url);
        this.iframe.src = this.url;
        this.frame.style.visibility = 'visible';
    }

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

    update(url) {
        // プレビュー画面に表示されているURLと同じ場合は何もしない
        if (this.iframe.src === url) {
            debugLog("プレビュー画面にすでに表示されているURLのため、更新をスキップします:", url);
            return;
        }

        // 更新タイマーを開始
        this.hide_timer.stop(); // 非表示タイマーを停止
        debugLog("更新間隔タイマーを開始します:", url);
        this.update_timer.start(url); // 引数としてURLを渡す

    }

    _update(url) {
        debugLog("更新間隔タイマーが終了しました。プレビューを更新します:", url);

        // マウスポインタがプレビュー画面上にある場合は更新をスキップ
        if (this.frame.matches(':hover')) {
            debugLog("マウスポインタがプレビュー画面上にあるため、URLの更新をスキップします:", url);
            return;
        }
        debugLog("マウスポインタがプレビュー画面上にないため、URLの更新を実行します:", url);
        // 更新時間経過後にマウスオーバーしているURLと一致している場合のみ更新
        if (url && url === this.currentHoveredUrl) {
            debugLog("更新時間経過前後でマウスオーバーしているURLが一致しているのでプレビューを更新します:", url);
            this.iframe.src = url;
        } else {
            debugLog("更新時間経過前後でURLが一致しなかったため、更新をスキップします:", url);

            // currentHoveredUrl が有効な URL の場合、再度 update() を呼び出す
            if (this.currentHoveredUrl) {
                debugLog("マウスポインタが移動後にURLをマウスオーバーしているので再度更新を試みます:", this.currentHoveredUrl);
                this.update(this.currentHoveredUrl);
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
          <iframe id="lprv_content"></iframe>
        `;

        // プレビューウィンドウの幅を設定
        frame.style.width = `${SETTINGS.previewWidthPx.value}px`;

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
        this.url = null; // 表示するリンクの URL を保持
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
        if (this.url !== url) {
            this.hide_timer.start(); // 一定時間後に消す
        }

        this.url = url;
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
        this.hide_timer.start(); // 表示後に非表示タイマーを開始
    }

    _hide() {
        this.icon.style.visibility = "hidden";
        this.icon.style.pointerEvents = "none"; // 非表示時はポインターイベントを無効にする
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
        const polygon = document.createElementNS(svgNS, "polygon");
        polygon.setAttribute("points", points);
        polygon.setAttribute("fill", "transparent"); // 背景を透明に設定
        polygon.style.pointerEvents = "auto"; // ポリゴン内のみポインターイベントを有効にする

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
        svg.appendChild(polygon);
        
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

        // イベントリスナーの設定
        polygon.addEventListener("mouseover", this._on_mouseover.bind(this));
        polygon.addEventListener("mouseout", this._on_mouseout.bind(this));

        return svg;
    }

    _getIconPosition(cursorX, cursorY) {
        const posX = cursorX + SETTINGS.iconDisplayOffsetX.value;
        const posY = cursorY + SETTINGS.iconDisplayOffsetY.value;
        return { x: posX, y: posY };
    }

    _on_mouseover(e) {
        this.isMouseOverIcon = true; // フラグを true に設定
        this.hide_timer.stop();
        preview_frame.show(this.url);
    }

    _on_mouseout(e) {
        this.isMouseOverIcon = false; // フラグを false に設定
        this.hide_timer.start();
        preview_frame.hide();
    }
}

// 非同期関数を作成
async function initialize() {
    await loadSettings().then(() => {
        debugLog("設定がロードされました:", SETTINGS);
        initializePreviewSettings(); // 独自の初期化処理を実行
        updatePreviewSettings(); // プレビュー設定を更新
    });

 
    // 設定が変更されたときに再読み込み
    browser.storage.onChanged.addListener(async (changes, area) => {
        if (area === "local") {
            await loadSettings().then(() => {
                updatePreviewSettings(); // SETTINGS変数が変更された際の処理を実行
            });

            // プレビュー機能がOFFに切り替えられた場合、プレビュー画面を非表示にする
            if (changes["previewEnabled"] && changes["previewEnabled"].newValue === false) {
                if (preview_frame.display) {
                    preview_frame._hide(); // タイマーを使わずに即座に非表示にする
                    debugLog("プレビュー機能がOFFに切り替えられたため、プレビュー画面を非表示にしました");
                }
            }

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
        }
    });
}

// 初期化関数を呼び出す
initialize();

// ページロード時の初期化処理をまとめた関数
async function initializePreviewSettings() {
    // preview_frame と preview_icon のインスタンスを初期化
    preview_frame = new PreviewFrame();
    preview_icon = new PreviewIcon();

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

    // プレビューウィンドウが表示されている場合、右マージン幅を更新
    if (preview_frame.display) {
        document.body.style.marginRight = `${SETTINGS.bodyRightMarginWidthPx.value}px`;
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

if (SETTINGS.previewEnabled.value === undefined) {
    SETTINGS.previewEnabled.value = SETTINGS.previewEnabled.default;
    browser.storage.local.set({ "previewEnabled": SETTINGS.previewEnabled.default });
}

// イベントリスナーを追加
document.addEventListener('mouseover', on_link_mouseover_doc);
document.addEventListener('mouseout', on_link_mouseout_doc);
