const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    offsetX: -30,
    offsetY: -30,
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    rightMarginWidth: 800,
    widthPx: 800 // プレビューウィンドウの幅の初期値（px）
};

// 初期値の直接定義を削除
let ICON_DISPLAY_DELAY;
let ICON_DISPLAY_TIME;
let OFFSET_X;
let OFFSET_Y;
let FRAME_DISPLAY_DELAY;
let FRAME_DISPLAY_TIME;
let FRAME_UPDATE_TIME;
let RIGHT_MARGIN_WIDTH;
let WIDTH_PX;

function debugLog(message, data = null) {
    browser.storage.local.get("debugMode").then((settings) => {
        if (settings.debugMode) {
            console.log(message, data);
        }
    });
}

debugLog("link_preview.js is loaded");

// 設定を動的に更新する関数
function updateSettings() {
    browser.storage.local.get(DEFAULT_SETTINGS).then((settings) => {
        ICON_DISPLAY_DELAY = settings.iconDisplayDelay;
        ICON_DISPLAY_TIME = settings.iconDisplayTime;
        OFFSET_X = settings.offsetX;
        OFFSET_Y = settings.offsetY;
        FRAME_DISPLAY_DELAY = settings.frameDisplayDelay;
        FRAME_DISPLAY_TIME = settings.frameDisplayTime;
        FRAME_UPDATE_TIME = settings.frameUpdateTime;
        RIGHT_MARGIN_WIDTH = settings.rightMarginWidth || DEFAULT_SETTINGS.rightMarginWidth;
        WIDTH_PX = settings.widthPx || DEFAULT_SETTINGS.widthPx;

        // タイマーのタイムアウト値を更新
        preview_icon.show_timer.updateTimeout(ICON_DISPLAY_DELAY);
        preview_icon.hide_timer.updateTimeout(ICON_DISPLAY_TIME);
        preview_frame.show_timer.updateTimeout(FRAME_DISPLAY_DELAY);
        preview_frame.hide_timer.updateTimeout(FRAME_DISPLAY_TIME);
        preview_frame.update_timer.updateTimeout(FRAME_UPDATE_TIME);

        // プレビューウィンドウの幅を再設定
        if (preview_frame.frame) {
            preview_frame.frame.style.width = `${WIDTH_PX}px`;
        }

        // プレビューウィンドウが表示されている場合、右マージン幅を更新
        if (preview_frame.display) {
            document.body.style.marginRight = `${RIGHT_MARGIN_WIDTH}px`;
        }

        // デバッグ用ログ
        debugLog("設定が更新されました:", {
            ICON_DISPLAY_DELAY,
            ICON_DISPLAY_TIME,
            OFFSET_X,
            OFFSET_Y,
            FRAME_DISPLAY_DELAY,
            FRAME_DISPLAY_TIME,
            FRAME_UPDATE_TIME,
            RIGHT_MARGIN_WIDTH,
            WIDTH_PX
        });
    });
}

// 初期設定を読み込む
updateSettings();

// 設定が変更されたときに再読み込み
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        updateSettings();
    }
});

browser.storage.local.get({ previewEnabled: true }).then((data) => {
    if (data.previewEnabled === undefined) {
        browser.storage.local.set({ previewEnabled: true });
    }
});

class Timer {
    constructor(func, timeout) {
        this.func = func;
        this.timeout = timeout;
        this.running = false;
    }
    start() {
        if (!this.running) {
            this.timer = setTimeout(this._exec.bind(this), this.timeout);
            this.running = true;
        }
    }
    _exec() {
        this.func();
        this.running = false;
    }
    stop() {
        if (this.running) {
            clearTimeout(this.timer);
            this.running = false;
        }
    }
    updateTimeout(newTimeout) {
        this.timeout = newTimeout; // タイムアウト値を更新
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
        const posX = cursorX + OFFSET_X;
        const posY = cursorY + OFFSET_Y;
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
        this.show_timer = new Timer(this._show.bind(this), FRAME_DISPLAY_DELAY);
        this.hide_timer = new Timer(this._hide.bind(this), FRAME_DISPLAY_TIME);
        this.update_timer = new Timer(this._update.bind(this), FRAME_UPDATE_TIME);
        this.locked = false;
        this.frame = this.build_frame();
        this.iframe = this.frame.querySelector('#lprv_content');
    }

    get display() {
        return this._display;
    }

    show(url) {
        this.url = url;
        this.show_timer.start();
        this.hide_timer.stop();

        // body要素の右マージンを設定
        document.body.style.marginRight = `${RIGHT_MARGIN_WIDTH}px`; // コンテンツの右マージン幅に合わせて調整
    }

    _show() {
        this._display = true;
        debugLog("プレビューを表示します:", this.url);
        this.iframe.src = this.url;
        this.frame.style.visibility = 'visible';
    }

    hide() {
        if (!this.locked) {
            this.hide_timer.start();
        }
        this.show_timer.stop();
        this.update_timer.stop();
    }

    _hide() {
        this._display = false;
        debugLog("プレビューを非表示にします");
        this.iframe.src = "about:blank";
        this.frame.style.visibility = 'hidden';

        // body要素の右マージンをリセット
        document.body.style.marginRight = '0';
    }

    update(url) {
        this.url = url;
        this.hide_timer.stop();
        this.update_timer.start();
    }

    _update() {
        if (this.iframe.src != this.url) {
            debugLog("プレビューを更新します:", this.url);
            this.iframe.src = this.url;
        }
        this.hide_timer.stop();
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
        frame.style.width = `${WIDTH_PX}px`;

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
    browser.storage.local.get("previewEnabled").then((data) => {
        if (!data.previewEnabled) return;

        // マウスオーバーした要素の親要素が<a>タグか確認
        const linkElement = e.target.closest('a');
        if (linkElement && linkElement.href) {
            const url = linkElement.href;
            if (preview_frame.display) {
                preview_frame.update(url);
            } else {
                preview_icon.show(url, e.clientX, e.clientY);
            }
        }
    });
}

function on_link_mouseout_doc(e) {
    if (e.target.nodeName == 'A') {
        if (preview_frame.display) {
            preview_frame.hide();
        }
    }
}
