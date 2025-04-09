const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    offsetX: -30,
    offsetY: -30,
    frameDisplayDelay: 200,
    frameDisplayTime: 2000,
    frameUpdateTime: 200
};

document.addEventListener('DOMContentLoaded', () => {
    // 保存された設定を読み込む（初期値はDEFAULT_SETTINGSを使用）
    browser.storage.local.get(DEFAULT_SETTINGS).then((settings) => {
        // ストレージに値が存在しない場合、初期値を保存
        const isEmpty = Object.keys(settings).length === 0; // ストレージが空か確認
        if (isEmpty) {
            browser.storage.local.set(DEFAULT_SETTINGS).then(() => {
                console.log("初期値をストレージに保存しました:", DEFAULT_SETTINGS);
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

        browser.storage.local.set({
            iconDisplayDelay,
            iconDisplayTime,
            offsetX,
            offsetY,
            frameDisplayDelay,
            frameDisplayTime,
            frameUpdateTime
        }).then(() => {
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
            console.log("設定を保存しました:", {
                iconDisplayDelay,
                iconDisplayTime,
                offsetX,
                offsetY,
                frameDisplayDelay,
                frameDisplayTime,
                frameUpdateTime
            });
        });
    });
});