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

// アドオンがインストールまたは更新されたときの処理
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("アドオンがインストールされました。初期設定を適用します。");

        // 初期設定を適用
        initializeSettings().then(() => {
            const previewEnabled = SETTINGS.previewEnabled.value ?? SETTINGS.previewEnabled.default;
            updateIcon(previewEnabled); // アイコンを初期化
        });
    } else if (details.reason === "update") {
        console.log("アドオンが更新されました。必要に応じて設定を更新します。");

        // 必要に応じて更新処理を実行
        initializeSettings().then(() => {
            const previewEnabled = SETTINGS.previewEnabled.value ?? SETTINGS.previewEnabled.default;
            updateIcon(previewEnabled); // アイコンを更新
        });
    }
});

// フォーカス状態を確認するメッセージハンドラ
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "checkWindowFocus") {
    console.log("checkWindowFocus メッセージを受信しました。");
    
    // タブIDを記録
    const tabId = sender.tab.id;
    
    // ウィンドウ状態を確認して応答を返す
    browser.windows.getCurrent()
      .then(win => {
        // 取得したウィンドウ状態をタブに送り返す
        debugLog("windowsFocusResponseでメッセージ送信します focused:", win.focused);
        return browser.tabs.sendMessage(tabId, {
          type: "windowFocusResponse",
          focused: win.focused
        });
      })
      .catch(err => {
        console.error("windows.getCurrent エラー:", err);
        return browser.tabs.sendMessage(tabId, {
          type: "windowFocusResponse",
          focused: false,
          error: err.message
        });
      });
    
    // リスナーは応答を返さない（別のメッセージで対応）
    return false;
  }
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

/* resolveShortenedUrl関数の実装によりbackgroundで短縮URLを展開してメッセージで返す必要がなくなったのでコメントアウト
browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
        // リダイレクト先のURLを保存
        browser.runtime.sendMessage({
            type: 'redirectDetected',
            originalUrl: details.url,
            redirectedUrl: details.redirectUrl,
        });
    },
    { urls: ["<all_urls>"] }, // すべてのURLを監視
    ["responseHeaders"]
);
*/

/* resolveShortenedUrl関数の実装によりbackgroundで短縮URLを展開してメッセージで返す必要がなくなったのでコメントアウト
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'resolveUrl') {
        fetch(message.url, { method: 'HEAD', redirect: 'follow' })
            .then((response) => {
                sendResponse({ success: true, resolvedUrl: response.url });
            })
            .catch((error) => {
                console.error('URL解決中にエラーが発生しました:', error);
                sendResponse({ success: false });
            });

        return true; // 非同期レスポンスを示す
    }
});
*/