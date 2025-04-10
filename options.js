const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    iconDisplayOffsetX: -30, // 変更: offsetX -> iconDisplayOffsetX
    iconDisplayOffsetY: -30, // 変更: offsetY -> iconDisplayOffsetY
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    ignoreXFrameOptions: false,
    ignoreContentSecurityPolicy: false,
    debugMode: false, // デバッグモードのデフォルト値
    rightMarginWidth: 800, // コンテンツの右マージン幅の初期値
    widthPercentage: 50, // プレビューウィンドウの幅の初期値（%）
    widthPx: 800 // プレビューウィンドウの幅の初期値（px）
};

function debugLog(message, data = null) {
    browser.storage.local.get("debugMode").then((settings) => {
        if (settings.debugMode) {
            console.log(message, data);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 保存された設定を読み込む（初期値はDEFAULT_SETTINGSを使用）
    browser.storage.local.get(DEFAULT_SETTINGS).then((settings) => {
        // ストレージに値が存在しない場合、初期値を保存
        const isEmpty = Object.keys(settings).length === 0; // ストレージが空か確認
        if (isEmpty) {
            browser.storage.local.set(DEFAULT_SETTINGS).then(() => {
                debugLog("初期値をストレージに保存しました:", DEFAULT_SETTINGS);
            });
            settings = DEFAULT_SETTINGS; // 初期値を設定
        }

        // フォームに値を設定
        document.getElementById('icon-display-delay').value = settings.iconDisplayDelay || DEFAULT_SETTINGS.iconDisplayDelay;
        document.getElementById('icon-display-time').value = settings.iconDisplayTime || DEFAULT_SETTINGS.iconDisplayTime;
        document.getElementById('icon-display-offset-x').value = settings.iconDisplayOffsetX || DEFAULT_SETTINGS.iconDisplayOffsetX; // 修正
        document.getElementById('icon-display-offset-y').value = settings.iconDisplayOffsetY || DEFAULT_SETTINGS.iconDisplayOffsetY; // 修正
        document.getElementById('frame-display-delay').value = settings.frameDisplayDelay || DEFAULT_SETTINGS.frameDisplayDelay;
        document.getElementById('frame-display-time').value = settings.frameDisplayTime || DEFAULT_SETTINGS.frameDisplayTime;
        document.getElementById('frame-update-time').value = settings.frameUpdateTime || DEFAULT_SETTINGS.frameUpdateTime;
        document.getElementById('debug-mode').checked = settings.debugMode || DEFAULT_SETTINGS.debugMode;
        document.getElementById('ignore-x-frame-options').checked = settings.ignoreXFrameOptions;
        document.getElementById('ignore-content-security-policy').checked = settings.ignoreContentSecurityPolicy;
        document.getElementById('right-margin-width').value = settings.rightMarginWidth || DEFAULT_SETTINGS.rightMarginWidth;
        document.getElementById('width-px').value = settings.widthPx || DEFAULT_SETTINGS.widthPx;
    });

    // 設定を保存する
    document.getElementById('save-settings').addEventListener('click', () => {
        const iconDisplayDelay = parseInt(document.getElementById('icon-display-delay').value, 10);
        const iconDisplayTime = parseInt(document.getElementById('icon-display-time').value, 10);
        const iconDisplayOffsetX = parseInt(document.getElementById('icon-display-offset-x').value, 10); // 修正
        const iconDisplayOffsetY = parseInt(document.getElementById('icon-display-offset-y').value, 10); // 修正
        const frameDisplayDelay = parseInt(document.getElementById('frame-display-delay').value, 10);
        const frameDisplayTime = parseInt(document.getElementById('frame-display-time').value, 10);
        const frameUpdateTime = parseInt(document.getElementById('frame-update-time').value, 10);
        const debugMode = document.getElementById('debug-mode').checked;
        const ignoreXFrameOptions = document.getElementById('ignore-x-frame-options').checked;
        const ignoreContentSecurityPolicy = document.getElementById('ignore-content-security-policy').checked;
        const rightMarginWidth = parseInt(document.getElementById('right-margin-width').value, 10);
        const widthPx = parseInt(document.getElementById('width-px').value, 10);

        browser.storage.local.set({
            iconDisplayDelay,
            iconDisplayTime,
            iconDisplayOffsetX, // 修正
            iconDisplayOffsetY, // 修正
            frameDisplayDelay,
            frameDisplayTime,
            frameUpdateTime,
            debugMode,
            ignoreXFrameOptions,
            ignoreContentSecurityPolicy,
            rightMarginWidth,
            widthPx
        }).then(() => {
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
            debugLog("設定を保存しました:", {
                iconDisplayDelay,
                iconDisplayTime,
                iconDisplayOffsetX, // 修正
                iconDisplayOffsetY, // 修正
                frameDisplayDelay,
                frameDisplayTime,
                frameUpdateTime,
                debugMode,
                ignoreXFrameOptions,
                ignoreContentSecurityPolicy,
                rightMarginWidth,
                widthPx
            });
        });
    });
});