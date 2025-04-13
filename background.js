/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

if (typeof SETTINGS === 'undefined') {
    console.error("[console()]SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("[console()]SETTINGS が正しく読み込まれました:", SETTINGS);
}

// 非同期関数を作成して設定をロード
async function initializeSettings() {
    await loadSettings().then(() => {
        debugLog("設定がロードされました:", SETTINGS);
    });
}

// Firefox 起動時にアイコンを正しい状態に設定
browser.runtime.onStartup.addListener(async () => {
    await initializeSettings(); // SETTINGS を最新状態に更新
    const previewEnabled = SETTINGS.previewEnabled.value ?? SETTINGS.previewEnabled.default;
    updateIcon(previewEnabled); // 起動時にアイコンを更新
});

// プレビュー機能の状態を切り替える関数
async function togglePreviewEnabled() {
    await initializeSettings(); // SETTINGS を最新状態に更新
    const currentState = SETTINGS.previewEnabled.value ?? SETTINGS.previewEnabled.default;
    const newState = !currentState;

    // ローカルストレージに保存
    await browser.storage.local.set({ "previewEnabled": newState });
    debugLog("プレビュー機能の状態を切り替えました:", newState);

    // アイコンの状態を更新
    updateIcon(newState);

    // 他のタブに通知を送信
    sendMessageToActiveTabs({ action: "updatePreviewEnabled", enabled: newState });
}

// ツールバーのアドオンアイコンがクリックされたときの処理
browser.browserAction.onClicked.addListener(() => {
    togglePreviewEnabled();
});

// アイコンの状態を更新する関数
function updateIcon(isEnabled) {
    const iconPath = isEnabled ? "images/icon-enabled.png" : "images/icon-disabled.png";
    browser.browserAction.setIcon({ path: iconPath });

    // ツールチップを2行に設定
    const title = `プレビュー機能のON/OFF切替\n${isEnabled ? "プレビュー機能: 有効" : "プレビュー機能: 無効"}`;
    browser.browserAction.setTitle({ title });
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

// メッセージ受信時の処理
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "settingsChanged") {
        debugLog("設定値変更を受信しました:", message.changes);

        await initializeSettings(); // 設定を再初期化
    }
});

function sendMessageToActiveTabs(message) {
    // すべてのタブを取得
    browser.tabs.query({}).then((tabs) => {
        for (const tab of tabs) {
            // 各タブにメッセージを送信
            browser.tabs.sendMessage(tab.id, message).catch((error) => {
                // エラー内容をログに出力
                debugLog(`タブ ${tab.id} にメッセージを送信中にエラーが発生しました:`, error);
            });
        }
    });
}
