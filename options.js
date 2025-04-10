if (typeof DEFAULT_SETTINGS === 'undefined') {
    console.error("DEFAULT_SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("DEFAULT_SETTINGS が正しく読み込まれました:", DEFAULT_SETTINGS);
}

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
        document.getElementById('url-filter-list').value = settings.SLPGC_urlFilterList || DEFAULT_SETTINGS.urlFilterList;
        document.getElementById('keep-preview-frame-open').checked = settings.SLPGC_keepPreviewFrameOpen || DEFAULT_SETTINGS.keepPreviewFrameOpen;
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
            debugMode: document.getElementById('debug-mode').checked,
            urlFilterList: document.getElementById('url-filter-list').value,
            keepPreviewFrameOpen: document.getElementById('keep-preview-frame-open').checked,
        };

        browser.storage.local.set(
            Object.fromEntries(
                Object.entries(settings).map(([key, value]) => [`SLPGC_${key}`, value])
            )
        ).then(() => {
            debugLog("設定を保存しました:", settings);

            // 他のタブに通知を送信
            browser.runtime.sendMessage({ action: "updateKeepPreviewFrameOpen" });

            // ステータス表示
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
        });
    });

    document.getElementById('reset-settings').addEventListener('click', () => {
        // フォームに初期値を反映（ローカルストレージには保存しない）
        document.getElementById('icon-display-delay').value = DEFAULT_SETTINGS.iconDisplayDelay;
        document.getElementById('icon-display-time').value = DEFAULT_SETTINGS.iconDisplayTime;
        document.getElementById('icon-display-offset-x').value = DEFAULT_SETTINGS.iconDisplayOffsetX;
        document.getElementById('icon-display-offset-y').value = DEFAULT_SETTINGS.iconDisplayOffsetY;
        document.getElementById('frame-display-delay').value = DEFAULT_SETTINGS.frameDisplayDelay;
        document.getElementById('frame-display-time').value = DEFAULT_SETTINGS.frameDisplayTime;
        document.getElementById('frame-update-time').value = DEFAULT_SETTINGS.frameUpdateTime;
        document.getElementById('body-right-margin-width-px').value = DEFAULT_SETTINGS.bodyRightMarginWidthPx;
        document.getElementById('preview-width-px').value = DEFAULT_SETTINGS.previewWidthPx;
        document.getElementById('ignore-x-frame-options').checked = DEFAULT_SETTINGS.ignoreXFrameOptions;
        document.getElementById('ignore-content-security-policy').checked = DEFAULT_SETTINGS.ignoreContentSecurityPolicy;
        document.getElementById('debug-mode').checked = DEFAULT_SETTINGS.debugMode;
        document.getElementById('url-filter-list').value = DEFAULT_SETTINGS.urlFilterList;
        document.getElementById('keep-preview-frame-open').checked = DEFAULT_SETTINGS.keepPreviewFrameOpen;

        // ステータス表示
        const status = document.getElementById('status');
        status.textContent = '設定を初期値に戻しました！（保存されていません）';
        setTimeout(() => (status.textContent = ''), 2000);

        debugLog("フォームの値を初期値に戻しました（保存されていません）:", DEFAULT_SETTINGS);
    });
});