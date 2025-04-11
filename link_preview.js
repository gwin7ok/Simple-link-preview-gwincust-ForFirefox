/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// `import` 文を削除し、グローバルスコープの `DEFAULT_SETTINGS` を利用

let ICON_DISPLAY_DELAY;
let ICON_DISPLAY_TIME;
let ICON_DISPLAY_OFFSET_X; // 変更: OFFSET_X -> ICON_DISPLAY_OFFSET_X
let ICON_DISPLAY_OFFSET_Y; // 変更: OFFSET_Y -> ICON_DISPLAY_OFFSET_Y
let FRAME_DISPLAY_DELAY;
let FRAME_DISPLAY_TIME;
let FRAME_UPDATE_TIME;
let BODY_RIGHT_MARGIN_WIDTH_PX; // 変更: RIGHT_MARGIN_WIDTH -> BODY_RIGHT_MARGIN_WIDTH_PX
let PREVIEW_WIDTH_PX; // 変更: WIDTH_PX -> PREVIEW_WIDTH_PX
let IGNORE_X_FRAME_OPTIONS; // 追加
let IGNORE_CONTENT_SECURITY_POLICY; // 追加
let DEBUG_MODE; // 追加

function debugLog(message, data = null) {
    browser.storage.local.get("SLPGC_debugMode").then((settings) => { // 修正: debugMode -> SLPGC_debugMode
        if (settings.SLPGC_debugMode) {
            console.log(message, data);
        }
    });
}

debugLog("link_preview.js is loaded");

function updateSettings() {
    browser.storage.local.get(
        Object.fromEntries(
            Object.keys(DEFAULT_SETTINGS).map(key => [`SLPGC_${key}`, DEFAULT_SETTINGS[key]])
        )
    ).then((settings) => {
        ICON_DISPLAY_DELAY = settings.SLPGC_iconDisplayDelay || DEFAULT_SETTINGS.iconDisplayDelay;
        ICON_DISPLAY_TIME = settings.SLPGC_iconDisplayTime || DEFAULT_SETTINGS.iconDisplayTime;
        ICON_DISPLAY_OFFSET_X = settings.SLPGC_iconDisplayOffsetX || DEFAULT_SETTINGS.iconDisplayOffsetX;
        ICON_DISPLAY_OFFSET_Y = settings.SLPGC_iconDisplayOffsetY || DEFAULT_SETTINGS.iconDisplayOffsetY;
        FRAME_DISPLAY_DELAY = settings.SLPGC_frameDisplayDelay || DEFAULT_SETTINGS.frameDisplayDelay;
        FRAME_DISPLAY_TIME = settings.SLPGC_frameDisplayTime || DEFAULT_SETTINGS.frameDisplayTime;
        FRAME_UPDATE_TIME = settings.SLPGC_frameUpdateTime || DEFAULT_SETTINGS.frameUpdateTime;
        BODY_RIGHT_MARGIN_WIDTH_PX = settings.SLPGC_bodyRightMarginWidthPx || DEFAULT_SETTINGS.bodyRightMarginWidthPx;
        PREVIEW_WIDTH_PX = settings.SLPGC_previewWidthPx || DEFAULT_SETTINGS.previewWidthPx;
        IGNORE_X_FRAME_OPTIONS = settings.SLPGC_ignoreXFrameOptions || DEFAULT_SETTINGS.ignoreXFrameOptions;
        IGNORE_CONTENT_SECURITY_POLICY = settings.SLPGC_ignoreContentSecurityPolicy || DEFAULT_SETTINGS.ignoreContentSecurityPolicy;
        DEBUG_MODE = settings.SLPGC_debugMode || DEFAULT_SETTINGS.debugMode;

        // タイマーのタイムアウト値を更新
        preview_icon.show_timer.updateTimeout(ICON_DISPLAY_DELAY);
        preview_icon.hide_timer.updateTimeout(ICON_DISPLAY_TIME);
        preview_frame.show_timer.updateTimeout(FRAME_DISPLAY_DELAY);
        preview_frame.hide_timer.updateTimeout(FRAME_DISPLAY_TIME);
        preview_frame.update_timer.updateTimeout(FRAME_UPDATE_TIME);

        // プレビューウィンドウの幅を再設定
        if (preview_frame.frame) {
            preview_frame.frame.style.width = `${PREVIEW_WIDTH_PX}px`;
        }

        // プレビューウィンドウが表示されている場合、右マージン幅を更新
        if (preview_frame.display) {
            document.body.style.marginRight = `${BODY_RIGHT_MARGIN_WIDTH_PX}px`;
        }

        debugLog("設定が更新されました:", {
            ICON_DISPLAY_DELAY,
            ICON_DISPLAY_TIME,
            ICON_DISPLAY_OFFSET_X,
            ICON_DISPLAY_OFFSET_Y,
            FRAME_DISPLAY_DELAY,
            FRAME_DISPLAY_TIME,
            FRAME_UPDATE_TIME,
            BODY_RIGHT_MARGIN_WIDTH_PX,
            PREVIEW_WIDTH_PX,
            IGNORE_X_FRAME_OPTIONS,
            IGNORE_CONTENT_SECURITY_POLICY,
            DEBUG_MODE
        });
    });
}

// 初期設定を読み込む
updateSettings();

// 初回起動時にデフォルト設定を保存
browser.storage.local.get(
    Object.fromEntries(
        Object.keys(DEFAULT_SETTINGS).map(key => [`SLPGC_${key}`, DEFAULT_SETTINGS[key]])
    )
).then((settings) => {
    if (Object.keys(settings).length === 0) {
        browser.storage.local.set(
            Object.fromEntries(
                Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [`SLPGC_${key}`, value])
            )
        );
    }
});

// 設定が変更されたときに再読み込み
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        // 設定の更新
        updateSettings();

        // プレビュー機能がOFFに切り替えられた場合、プレビュー画面を非表示にする
        if (changes.SLPGC_previewEnabled && changes.SLPGC_previewEnabled.newValue === false) {
            if (preview_frame.display) {
                preview_frame.hide();
                debugLog("プレビュー機能がOFFに切り替えられたため、プレビュー画面を非表示にしました");
            }
        }
    }
});

browser.storage.local.get({ SLPGC_previewEnabled: true }).then((data) => { // 修正: previewEnabled -> SLPGC_previewEnabled
    if (data.SLPGC_previewEnabled === undefined) {
        browser.storage.local.set({ SLPGC_previewEnabled: true }); // 修正: previewEnabled -> SLPGC_previewEnabled
    }
});

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
        this.show_timer = new Timer(this._show.bind(this), ICON_DISPLAY_DELAY);
        this.hide_timer = new Timer(this._hide.bind(this), ICON_DISPLAY_TIME);
        this.icon = this.build_icon();
        this.url = null; // 表示するリンクの URL を保持
        this.mousePosition = { x: 0, y: 0 }; // マウスポインタの位置を保持

        // マウスの動きを追跡
        document.addEventListener("mousemove", (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        });
    }

    show(url) {
        if (this.icon.style.visibility == 'hidden') {
            this.url = url;
            this.show_timer.stop();
            this.show_timer.start();
        }
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
        this.hide_timer.start();
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
        icon.addEventListener("mouseover", this._on_mouseover.bind(this));
        icon.addEventListener("mouseout", this._on_mouseout.bind(this));
        return icon;
    }

    _getIconPosition(cursorX, cursorY) {
        const posX = cursorX + ICON_DISPLAY_OFFSET_X;
        const posY = cursorY + ICON_DISPLAY_OFFSET_Y;
        return { x: posX, y: posY };
    }

    _on_mouseover(e) {
        this.hide_timer.stop();
        preview_frame.show(this.url);
    }

    _on_mouseout(e) {
        this.hide_timer.start();
        preview_frame.hide();
    }
}

class PreviewFrame {
    constructor() {
        this._display = false;
        this.locked = false;
        this.pendingUrl = null; // 更新間隔中のURL
        this.currentHoveredUrl = null; // 現在マウスオーバーしているURL
        this.show_timer = new Timer(this._show.bind(this), FRAME_DISPLAY_DELAY);
        this.hide_timer = new Timer(this._hide.bind(this), FRAME_DISPLAY_TIME);
        this.update_timer = new Timer((url) => this._update(url), FRAME_UPDATE_TIME);
        this.frame = this.build_frame();
        this.iframe = this.frame.querySelector('#lprv_content');

        // ローカルストレージからロック状態を読み込む
        browser.storage.local.get("SLPGC_keepPreviewFrameOpen").then((settings) => {
            this.locked = settings.SLPGC_keepPreviewFrameOpen || false;
            this._updatePinButtonState(); // ピンボタンの状態を更新
        });
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
        document.body.style.marginRight = `${BODY_RIGHT_MARGIN_WIDTH_PX}px`;

        debugLog("プレビューを表示します:", this.url);
        this.iframe.src = this.url;
        this.frame.style.visibility = 'visible';
    }

    hide() {
        // プレビュー機能がOFFの場合、またはロックされていない場合に非表示にする
        browser.storage.local.get("SLPGC_previewEnabled").then((settings) => {
            if (!settings.SLPGC_previewEnabled || !this.locked) {
                this.hide_timer.start();
                this.show_timer.stop();
                this.update_timer.stop();
            } else {
                debugLog("プレビューがロックされているため、非表示にしません");
            }
        });
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
        this.hide_timer.stop();
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
                    // 更新後にリセット
            this.hide_timer.stop();

        } else {
            debugLog("更新時間経過前後でURLが一致しなかったため、更新をスキップします:", url);

            // currentHoveredUrl が有効な URL の場合、再度 update() を呼び出す
            if (this.currentHoveredUrl) {
                debugLog("マウスポインタが移動後にURLをマウスオーバーしているので再度更新を試みます:", this.currentHoveredUrl);
                this.update(this.currentHoveredUrl);
            }
        }

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
        frame.style.width = `${PREVIEW_WIDTH_PX}px`;

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
        this.locked = !this.locked;
        debugLog("プレビューの固定状態を切り替えました:", this.locked);
        this.locked ? btn.setAttribute('locked', 'yes') : btn.removeAttribute('locked');

        // ローカルストレージにロック状態を保存
        browser.storage.local.set({ SLPGC_keepPreviewFrameOpen: this.locked }).then(() => {
            // 他のタブに通知を送信
            browser.runtime.sendMessage({ action: "updateKeepPreviewFrameOpen" });
        });

        this._updatePinButtonState(); // ピンボタンの状態を更新
    }
    _on_hide_click(e) {
        debugLog("非表示ボタンがクリックされました");
        this._hide();
    }
    _on_mouseover(e) {
        this.hide_timer.stop();
    }
    _on_mouseout(e) {
        if (!this.locked) {
            this.hide_timer.start();
        }
    }
}

let preview_icon = new PreviewIcon();
let preview_frame = new PreviewFrame();

let links = document.querySelectorAll('a');
document.addEventListener('mouseover', on_link_mouseover_doc);
document.addEventListener('mouseout', on_link_mouseout_doc);

function on_link_mouseover_doc(e) {
    browser.storage.local.get(["SLPGC_previewEnabled", "SLPGC_urlFilterList"]).then((data) => {
        if (!data.SLPGC_previewEnabled) return;

        // マウスオーバーした要素の親要素が<a>タグか確認
        const linkElement = e.target.closest('a');
        if (linkElement && linkElement.href) {
            const url = linkElement.href;

            // フィルタリストを確認
            const filterList = (data.SLPGC_urlFilterList || "").split("\n").map(s => s.trim()).filter(s => s);
            if (filterList.some(filter => url.includes(filter))) {
                debugLog("URLがフィルタリストに一致したため、プレビューを表示しません:", url);
                return;
            }

            preview_frame.currentHoveredUrl = url; // 現在マウスオーバーしているURLを設定

            if (preview_frame.display) {
                preview_frame.update(url);
            } else {
                preview_icon.show(url, e.clientX, e.clientY);
            }
        }else {
        debugLog("マウスオーバーした要素が<a>タグではないため、プレビューを表示しません:", e.target.nodeName);
        preview_frame.currentHoveredUrl = null; // マウスオーバーした要素が<a>タグではない場合、URLをリセット
        }   
    })  ;
}

function on_link_mouseout_doc(e) {
    if (e.target.nodeName == 'A') {
        preview_frame.currentHoveredUrl = null; // マウスアウト時に現在のURLをリセット
        if (preview_frame.display) {
            preview_frame.hide();
        }
    }
}

// メッセージリスナーを追加
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "updateKeepPreviewFrameOpen") {
        // ローカルストレージからロック状態を再読み込み
        browser.storage.local.get("SLPGC_keepPreviewFrameOpen").then((settings) => {
            preview_frame.locked = settings.SLPGC_keepPreviewFrameOpen || false;
            preview_frame._updatePinButtonState(); // ピンボタンの状態を更新
            debugLog("ピンの状態を更新しました:", preview_frame.locked);
        });
    }
});
