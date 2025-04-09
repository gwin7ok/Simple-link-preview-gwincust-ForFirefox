// プレビュー機能の状態を初期化
browser.storage.local.get({ previewEnabled: true }).then((data) => {
    browser.storage.local.set({ previewEnabled: data.previewEnabled });
    updateIcon(data.previewEnabled); // 初期状態のアイコンを設定
});

// Firefox 起動時にアイコンを正しい状態に設定
browser.runtime.onStartup.addListener(() => {
    browser.storage.local.get("previewEnabled").then((data) => {
        updateIcon(data.previewEnabled); // 起動時にアイコンを更新
    });
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

// コンテキストメニューを作成
browser.menus.create({
    id: "open-options",
    title: "オプション",
    contexts: ["browser_action"] // ツールバーアイコンの右クリックメニューに表示
});

// メニュークリック時の処理
browser.menus.onClicked.addListener((info) => {
    if (info.menuItemId === "open-options") {
        browser.runtime.openOptionsPage(); // オプションページを開く
    }
});