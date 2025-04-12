/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

if (typeof SETTINGS === 'undefined') {
    console.error("SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("SETTINGS が正しく読み込まれました:", SETTINGS);
}

debugLog("link_preview.js is loaded");

// グローバルスコープで preview_frame と preview_icon を定義
let preview_frame;
let preview_icon;

// 関数定義部分を上部に移動
function on_link_mouseover_doc(e) {
    if (!SETTINGS.previewEnabled.value) return;

    const linkElement = e.target.closest('a');
    if (linkElement && linkElement.href) {
        const url = linkElement.href;

        const filterList = (SETTINGS.urlFilterList.value || "").split("\n").map(s => s.trim()).filter(s => s);
        if (filterList.some(filter => url.includes(filter))) {
            debugLog("URLがフィルタリストに一致したため、プレビューを表示しません:", url);
            return;
        }

        preview_frame.currentHoveredUrl = url;

        if (preview_frame.display) {
            preview_frame.update(url);
        } else {
            preview_icon.show(url, e.clientX, e.clientY);
        }
    } else {
        debugLog("マウスオーバーした要素が<a>タグではないため、プレビューを表示しません:", e.target.nodeName);
        preview_frame.currentHoveredUrl = null;
    }
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
        case "updateKeepPreviewFrameOpen":
            preview_frame.locked = SETTINGS.keepPreviewFrameOpen.value || false;
            preview_frame._updatePinButtonState();
            debugLog("ピンの状態を更新しました:", preview_frame.locked);
            break;

        case "updatePreviewEnabled":
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

        // フレームを先に初期化
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

    _updatePinButtonState() {
        const pinButton = this.frame.querySelector('#push-pin');
        if (this.locked) {
            pinButton.setAttribute('locked', 'yes');
        } else {
            pinButton.removeAttribute('locked');
        }
    }

    get display() {
        return this._display;
    }

    show(url) {
        this.url = url;
        this.show_timer.start();
        this.hide_timer.stop();
    }

    _show() {
        this._display = true;

        // プレビューを表示する直前にBodyの右マージン幅を設定
        document.body.style.marginRight = `${SETTINGS.bodyRightMarginWidthPx.value}px`;

        debugLog("プレビューを表示します:", this.url);
        this.iframe.src = this.url;
        this.frame.style.visibility = 'visible';
    }

    hide() {
        if (!SETTINGS.previewEnabled.value) {
            debugLog("プレビュー機能がOFFのため、非表示にします");
            this.hide_timer.start();
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

        // プレビューを非表示にした際にBodyの右マージン幅をリセット
        document.body.style.marginRight = '0';
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

        // SETTINGS にロック状態を反映
        SETTINGS.keepPreviewFrameOpen.value = this.locked;

        // ローカルストレージにロック状態を保存
        browser.storage.local.set({ [`${STORAGE_PREFIX}keepPreviewFrameOpen`]: this.locked }).then(() => {
            // 他のタブに通知を送信
            browser.runtime.sendMessage({ action: "updateKeepPreviewFrameOpen" });
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
        this.icon.style.visibility = 'visible';
        this.hide_timer.start(); // 表示後に非表示タイマーを開始
    }

    _hide() {
        this.icon.style.visibility = 'hidden';
    }

    build_icon() {
        let icon = document.createElement("img");
        icon.setAttribute("src", browser.extension.getURL("images/mouseover.png"));
        icon.setAttribute("id", "link_preview_icon");
        icon.style.visibility = 'hidden';
        document.body.appendChild(icon);

        // アイコン上にマウスオーバーしたときの処理
        icon.addEventListener("mouseover", this._on_mouseover.bind(this));

        // アイコンからマウスアウトしたときの処理
        icon.addEventListener("mouseout", this._on_mouseout.bind(this));

        return icon;
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
    });

 
    // 設定が変更されたときに再読み込み
    browser.storage.onChanged.addListener(async (changes, area) => {
        if (area === "local") {
            await loadSettings().then(() => {
                initializePreviewSettings(); // 再度初期化処理を実行
            });

            // プレビュー機能がOFFに切り替えられた場合、プレビュー画面を非表示にする
            if (changes[`${STORAGE_PREFIX}previewEnabled`] && changes[`${STORAGE_PREFIX}previewEnabled`].newValue === false) {
                if (preview_frame.display) {
                    preview_frame._hide(); // タイマーを使わずに即座に非表示にする
                    debugLog("プレビュー機能がOFFに切り替えられたため、プレビュー画面を非表示にしました");
                }
            }
        }
    });
}

// 初期化関数を呼び出す
initialize();

// 独自の初期化処理をまとめた関数
async function initializePreviewSettings() {
    // preview_frame と preview_icon のインスタンスを初期化
    preview_frame = new PreviewFrame();
    preview_icon = new PreviewIcon();

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

    debugLog("プレビュー設定が反映されました:", SETTINGS);
}

if (SETTINGS.previewEnabled.value === undefined) {
    SETTINGS.previewEnabled.value = SETTINGS.previewEnabled.default;
    browser.storage.local.set({ [`${STORAGE_PREFIX}previewEnabled`]: SETTINGS.previewEnabled.default });
}

// イベントリスナーを追加
let links = document.querySelectorAll('a');
document.addEventListener('mouseover', on_link_mouseover_doc);
document.addEventListener('mouseout', on_link_mouseout_doc);
