const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    iconDisplayOffsetX: -30,
    iconDisplayOffsetY: -30,
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    bodyRightMarginWidthPx: 800,
    previewWidthPx: 800,
    ignoreXFrameOptions: false,
    ignoreContentSecurityPolicy: false,
    debugMode: false,
};

function debugLog(message, data = null) {
    browser.storage.local.get("SLPGC_debugMode").then((settings) => {
        if (settings.SLPGC_debugMode) {
            console.log(message, data);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    browser.storage.local.get(
        Object.fromEntries(
            Object.keys(DEFAULT_SETTINGS).map(key => [`SLPGC_${key}`, DEFAULT_SETTINGS[key]])
        )
    ).then((settings) => {
        document.getElementById('icon-display-delay').value = settings.SLPGC_iconDisplayDelay || DEFAULT_SETTINGS.iconDisplayDelay;
        document.getElementById('icon-display-time').value = settings.SLPGC_iconDisplayTime || DEFAULT_SETTINGS.iconDisplayTime;
        document.getElementById('icon-display-offset-x').value = settings.SLPGC_iconDisplayOffsetX || DEFAULT_SETTINGS.iconDisplayOffsetX;
        document.getElementById('icon-display-offset-y').value = settings.SLPGC_iconDisplayOffsetY || DEFAULT_SETTINGS.iconDisplayOffsetY;
        document.getElementById('frame-display-delay').value = settings.SLPGC_frameDisplayDelay || DEFAULT_SETTINGS.frameDisplayDelay;
        document.getElementById('frame-display-time').value = settings.SLPGC_frameDisplayTime || DEFAULT_SETTINGS.frameDisplayTime;
        document.getElementById('frame-update-time').value = settings.SLPGC_frameUpdateTime || DEFAULT_SETTINGS.frameUpdateTime;
        document.getElementById('body-right-margin-width-px').value = settings.SLPGC_bodyRightMarginWidthPx || DEFAULT_SETTINGS.bodyRightMarginWidthPx;
        document.getElementById('preview-width-px').value = settings.SLPGC_previewWidthPx || DEFAULT_SETTINGS.previewWidthPx;
        document.getElementById('ignore-x-frame-options').checked = settings.SLPGC_ignoreXFrameOptions || DEFAULT_SETTINGS.ignoreXFrameOptions;
        document.getElementById('ignore-content-security-policy').checked = settings.SLPGC_ignoreContentSecurityPolicy || DEFAULT_SETTINGS.ignoreContentSecurityPolicy;
        document.getElementById('debug-mode').checked = settings.SLPGC_debugMode || DEFAULT_SETTINGS.debugMode;
    });

    document.getElementById('save-settings').addEventListener('click', () => {
        const settings = {
            iconDisplayDelay: parseInt(document.getElementById('icon-display-delay').value, 10),
            iconDisplayTime: parseInt(document.getElementById('icon-display-time').value, 10),
            iconDisplayOffsetX: parseInt(document.getElementById('icon-display-offset-x').value, 10),
            iconDisplayOffsetY: parseInt(document.getElementById('icon-display-offset-y').value, 10),
            frameDisplayDelay: parseInt(document.getElementById('frame-display-delay').value, 10),
            frameDisplayTime: parseInt(document.getElementById('frame-display-time').value, 10),
            frameUpdateTime: parseInt(document.getElementById('frame-update-time').value, 10),
            bodyRightMarginWidthPx: parseInt(document.getElementById('body-right-margin-width-px').value, 10),
            previewWidthPx: parseInt(document.getElementById('preview-width-px').value, 10),
            ignoreXFrameOptions: document.getElementById('ignore-x-frame-options').checked,
            ignoreContentSecurityPolicy: document.getElementById('ignore-content-security-policy').checked,
            debugMode: document.getElementById('debug-mode').checked
        };

        browser.storage.local.set(
            Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [`SLPGC_${key}`, value])
            )
        ).then(() => {
            debugLog("設定を保存しました:", settings);
        });
    });
});