const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    offsetX: -30,
    offsetY: -30,
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    ignoreXFrameOptions: false,
    ignoreContentSecurityPolicy: false,
    debugMode: false, // デバッグモードのデフォルト値
    rightMarginWidth: 800, // コンテンツの右マージン幅の初期値
    widthPercentage: 50 // プレビューウィンドウの幅の初期値（%）
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
        document.getElementById('offset-x').value = settings.offsetX || DEFAULT_SETTINGS.offsetX;
        document.getElementById('offset-y').value = settings.offsetY || DEFAULT_SETTINGS.offsetY;
        document.getElementById('frame-display-delay').value = settings.frameDisplayDelay || DEFAULT_SETTINGS.frameDisplayDelay;
        document.getElementById('frame-display-time').value = settings.frameDisplayTime || DEFAULT_SETTINGS.frameDisplayTime;
        document.getElementById('frame-update-time').value = settings.frameUpdateTime || DEFAULT_SETTINGS.frameUpdateTime;
        document.getElementById('debug-mode').checked = settings.debugMode || DEFAULT_SETTINGS.debugMode;
        document.getElementById('ignore-x-frame-options').checked = settings.ignoreXFrameOptions;
        document.getElementById('ignore-content-security-policy').checked = settings.ignoreContentSecurityPolicy;
        document.getElementById('right-margin-width').value = settings.rightMarginWidth || DEFAULT_SETTINGS.rightMarginWidth;
        document.getElementById('width-percentage').value = settings.widthPercentage || DEFAULT_SETTINGS.widthPercentage;
    });

    // 設定を保存する
    document.getElementById('save-settings').addEventListener('click', () => {
        const iconDisplayDelay = parseInt(document.getElementById('icon-display-delay').value, 10);
        const iconDisplayTime = parseInt(document.getElementById('icon-display-time').value, 10);
        const offsetX = parseInt(document.getElementById('offset-x').value, 10);
        const offsetY = parseInt(document.getElementById('offset-y').value, 10);
        const frameDisplayDelay = parseInt(document.getElementById('frame-display-delay').value, 10);
        const frameDisplayTime = parseInt(document.getElementById('frame-display-time').value, 10);
        const frameUpdateTime = parseInt(document.getElementById('frame-update-time').value, 10);
        const debugMode = document.getElementById('debug-mode').checked;
        const ignoreXFrameOptions = document.getElementById('ignore-x-frame-options').checked;
        const ignoreContentSecurityPolicy = document.getElementById('ignore-content-security-policy').checked;
        const rightMarginWidth = parseInt(document.getElementById('right-margin-width').value, 10);
        const widthPercentage = parseInt(document.getElementById('width-percentage').value, 10);

        browser.storage.local.set({
            iconDisplayDelay,
            iconDisplayTime,
            offsetX,
            offsetY,
            frameDisplayDelay,
            frameDisplayTime,
            frameUpdateTime,
            debugMode,
            ignoreXFrameOptions,
            ignoreContentSecurityPolicy,
            rightMarginWidth,
            widthPercentage
        }).then(() => {
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
            debugLog("設定を保存しました:", {
                iconDisplayDelay,
                iconDisplayTime,
                offsetX,
                offsetY,
                frameDisplayDelay,
                frameDisplayTime,
                frameUpdateTime,
                debugMode,
                ignoreXFrameOptions,
                ignoreContentSecurityPolicy,
                rightMarginWidth,
                widthPercentage
            });
        });
    });
});