const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    iconDisplayOffsetX: -30,
    iconDisplayOffsetY: -30,
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    ignoreXFrameOptions: false,
    ignoreContentSecurityPolicy: false,
    debugMode: false,
    bodyRightMarginWidthPx: 800, // 変更: rightMarginWidth -> bodyRightMarginWidthPx
    previewWidthPx: 800 // 変更: widthPx -> previewWidthPx
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
        document.getElementById('icon-display-offset-x').value = settings.iconDisplayOffsetX || DEFAULT_SETTINGS.iconDisplayOffsetX;
        document.getElementById('icon-display-offset-y').value = settings.iconDisplayOffsetY || DEFAULT_SETTINGS.iconDisplayOffsetY;
        document.getElementById('frame-display-delay').value = settings.frameDisplayDelay || DEFAULT_SETTINGS.frameDisplayDelay;
        document.getElementById('frame-display-time').value = settings.frameDisplayTime || DEFAULT_SETTINGS.frameDisplayTime;
        document.getElementById('frame-update-time').value = settings.frameUpdateTime || DEFAULT_SETTINGS.frameUpdateTime;
        document.getElementById('debug-mode').checked = settings.debugMode || DEFAULT_SETTINGS.debugMode;
        document.getElementById('ignore-x-frame-options').checked = settings.ignoreXFrameOptions;
        document.getElementById('ignore-content-security-policy').checked = settings.ignoreContentSecurityPolicy;
        document.getElementById('body-right-margin-width-px').value = settings.bodyRightMarginWidthPx || DEFAULT_SETTINGS.bodyRightMarginWidthPx; // 修正
        document.getElementById('preview-width-px').value = settings.previewWidthPx || DEFAULT_SETTINGS.previewWidthPx; // 修正
    });

    // 設定を保存する
    document.getElementById('save-settings').addEventListener('click', () => {
        const iconDisplayDelay = parseInt(document.getElementById('icon-display-delay').value, 10);
        const iconDisplayTime = parseInt(document.getElementById('icon-display-time').value, 10);
        const iconDisplayOffsetX = parseInt(document.getElementById('icon-display-offset-x').value, 10);
        const iconDisplayOffsetY = parseInt(document.getElementById('icon-display-offset-y').value, 10);
        const frameDisplayDelay = parseInt(document.getElementById('frame-display-delay').value, 10);
        const frameDisplayTime = parseInt(document.getElementById('frame-display-time').value, 10);
        const frameUpdateTime = parseInt(document.getElementById('frame-update-time').value, 10);
        const debugMode = document.getElementById('debug-mode').checked;
        const ignoreXFrameOptions = document.getElementById('ignore-x-frame-options').checked;
        const ignoreContentSecurityPolicy = document.getElementById('ignore-content-security-policy').checked;
        const bodyRightMarginWidthPx = parseInt(document.getElementById('body-right-margin-width-px').value, 10); // 修正
        const previewWidthPx = parseInt(document.getElementById('preview-width-px').value, 10); // 修正

        browser.storage.local.set({
            iconDisplayDelay,
            iconDisplayTime,
            iconDisplayOffsetX,
            iconDisplayOffsetY,
            frameDisplayDelay,
            frameDisplayTime,
            frameUpdateTime,
            debugMode,
            ignoreXFrameOptions,
            ignoreContentSecurityPolicy,
            bodyRightMarginWidthPx, // 修正
            previewWidthPx // 修正
        }).then(() => {
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
            debugLog("設定を保存しました:", {
                iconDisplayDelay,
                iconDisplayTime,
                iconDisplayOffsetX,
                iconDisplayOffsetY,
                frameDisplayDelay,
                frameDisplayTime,
                frameUpdateTime,
                debugMode,
                ignoreXFrameOptions,
                ignoreContentSecurityPolicy,
                bodyRightMarginWidthPx, // 修正
                previewWidthPx // 修正
            });
        });
    });
});