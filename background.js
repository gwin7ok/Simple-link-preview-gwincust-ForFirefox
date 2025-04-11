/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// プレビュー機能の状態を初期化
browser.storage.local.get({ SLPGC_previewEnabled: true }).then((data) => {
    browser.storage.local.set({ SLPGC_previewEnabled: data.SLPGC_previewEnabled });
    updateIcon(data.SLPGC_previewEnabled); // 初期状態のアイコンを設定
});

// Firefox 起動時にアイコンを正しい状態に設定
browser.runtime.onStartup.addListener(() => {
    browser.storage.local.get("SLPGC_previewEnabled").then((data) => {
        updateIcon(data.SLPGC_previewEnabled); // 起動時にアイコンを更新
    });
});

// アイコンをクリックしたときの処理
browser.browserAction.onClicked.addListener(() => {
    browser.storage.local.get("SLPGC_previewEnabled").then((data) => {
        const newState = !data.SLPGC_previewEnabled; // 状態を切り替え
        browser.storage.local.set({ SLPGC_previewEnabled: newState });

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

// メッセージ受信時の処理
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateKeepPreviewFrameOpen") {
        console.log("Received message to update keepPreviewFrameOpen");

        // すべてのタブにメッセージを送信
        browser.tabs.query({}).then((tabs) => {
            tabs.forEach((tab) => {
                // 特殊なタブを除外
                if (tab.url && !tab.url.startsWith("about:") && !tab.url.startsWith("chrome://") && !tab.url.startsWith("moz-extension://")) {
                    browser.tabs.sendMessage(tab.id, { action: "updateKeepPreviewFrameOpen" }).catch((error) => {
                        // `content_scripts` がロードされていない場合にスクリプトを挿入
                        if (error.message.includes("Could not establish connection")) {
                            browser.tabs.executeScript(tab.id, { file: "link_preview.js" }).then(() => {
                                // スクリプト挿入後に再送信
                                browser.tabs.sendMessage(tab.id, { action: "updateKeepPreviewFrameOpen" }).catch((error) => {
                                    console.warn(`Failed to send message to tab ${tab.id} after injecting script:`, error.message);
                                });
                            }).catch((error) => {
                                console.error(`Failed to inject script into tab ${tab.id}:`, error.message);
                            });
                        } else {
                            console.warn(`Failed to send message to tab ${tab.id}:`, error.message);
                        }
                    });
                }
            });
        });
    }
});