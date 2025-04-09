document.addEventListener('DOMContentLoaded', () => {
    // 保存された設定を読み込む
    browser.storage.local.get({
        iconDisplayDelay: 500,
        iconDisplayTime: 2500,
        offsetX: -20,
        offsetY: -10
    }).then((settings) => {
        document.getElementById('icon-display-delay').value = settings.iconDisplayDelay;
        document.getElementById('icon-display-time').value = settings.iconDisplayTime;
        document.getElementById('offset-x').value = settings.offsetX;
        document.getElementById('offset-y').value = settings.offsetY;
    });

    // 設定を保存する
    document.getElementById('save-settings').addEventListener('click', () => {
        const iconDisplayDelay = parseInt(document.getElementById('icon-display-delay').value, 10);
        const iconDisplayTime = parseInt(document.getElementById('icon-display-time').value, 10);
        const offsetX = parseInt(document.getElementById('offset-x').value, 10);
        const offsetY = parseInt(document.getElementById('offset-y').value, 10);

        browser.storage.local.set({
            iconDisplayDelay,
            iconDisplayTime,
            offsetX,
            offsetY
        }).then(() => {
            const status = document.getElementById('status');
            status.textContent = '設定を保存しました！';
            setTimeout(() => (status.textContent = ''), 2000);
        });
    });
});