// プレビュー機能の状態を初期化
browser.storage.local.get({ previewEnabled: true }).then((data) => {
    browser.storage.local.set({ previewEnabled: data.previewEnabled });
    updateIcon(data.previewEnabled); // 初期状態のアイコンを設定
});

// アイコンをクリックしたときの処理
browser.browserAction.onClicked.addListener(() => {
    browser.storage.local.get("previewEnabled").then((data) => {
        const newState = !data.previewEnabled; // 状態を切り替え
        browser.storage.local.set({ previewEnabled: newState });

        // アイコンの状態を更新
        updateIcon(newState);

        // デバッグ用ログ
        console.log(`プレビュー機能の状態を切り替えました: ${newState}`);
    });
});

// アイコンの状態を更新する関数
function updateIcon(enabled) {
    const iconPath = enabled ? "images/icon-enabled.png" : "images/icon-disabled.png";
    browser.browserAction.setIcon({ path: iconPath });
}
// background.js
browser.browserAction.onClicked.addListener(() => {
    console.log("アイコンがクリックされました"); // デバッグ用ログ

    browser.storage.local.get("previewEnabled").then((data) => {
        const newState = !data.previewEnabled;
        browser.storage.local.set({ previewEnabled: newState });
        updateIcon(newState);

        console.log(`プレビュー機能の状態を切り替えました: ${newState}`); // デバッグ用ログ
    });
});