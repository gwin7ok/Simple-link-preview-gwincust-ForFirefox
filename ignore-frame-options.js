/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// https://addons.mozilla.org/ru/firefox/addon/ignore-x-frame-options/reviews/
// https://gist.github.com/dergachev/e216b25d9a144914eae2
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onHeadersReceived

if (typeof SETTINGS === 'undefined') {
    console.error("[console()]SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("[console()]SETTINGS が正しく読み込まれました:", SETTINGS);
}

debugLog("ignore-frame-options.js is loaded");

// リスナーの状態を管理するマップ
const listeners = {
    xFrameOptions: null,
    contentSecurityPolicy: null
};

// リスナーを登録する汎用関数
function addListener(name, condition, filterHeader, debugHeaderName) {
    if (condition && !listeners[name]) {
        debugLog(`Enabling ${debugHeaderName} listener`);
        listeners[name] = (details) => {
            debugLog(`Intercepted headers (${debugHeaderName}):`, details.responseHeaders);
            const headers = details.responseHeaders.filter(
                (header) => header.name.toLowerCase() !== filterHeader
            );
            debugLog(`Modified headers (${debugHeaderName}):`, headers);
            return { responseHeaders: headers };
        };
        browser.webRequest.onHeadersReceived.addListener(
            listeners[name],
            { urls: ["<all_urls>"] },
            ["blocking", "responseHeaders"]
        );
    }
}

// リスナーを解除する汎用関数
function removeListener(name, debugHeaderName) {
    if (listeners[name]) {
        debugLog(`Disabling ${debugHeaderName} listener`);
        browser.webRequest.onHeadersReceived.removeListener(listeners[name]);
        listeners[name] = null;
    }
}

// リスナーを更新する関数
function updateListenersBasedOnSettings() {
    // X-Frame-Options リスナーの管理
    addListener(
        "xFrameOptions",
        SETTINGS.ignoreXFrameOptions.value,
        "x-frame-options",
        "X-Frame-Options"
    );
    if (!SETTINGS.ignoreXFrameOptions.value) {
        removeListener("xFrameOptions", "X-Frame-Options");
    }

    // Content-Security-Policy リスナーの管理
    addListener(
        "contentSecurityPolicy",
        SETTINGS.ignoreContentSecurityPolicy.value,
        "content-security-policy",
        "Content-Security-Policy"
    );
    if (!SETTINGS.ignoreContentSecurityPolicy.value) {
        removeListener("contentSecurityPolicy", "Content-Security-Policy");
    }
}

// 初期化関数
async function initializeSettings() {
    await loadSettings().then(() => {
        debugLog("設定がロードされました:", SETTINGS);
        updateListenersBasedOnSettings(); // 初期化時にリスナーを更新
    });
}

// 初期化関数を呼び出す
initializeSettings();

// メッセージ受信時の処理
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "settingsChanged") {
        debugLog("設定値変更を受信しました:", message.changes);

        // 設定を再初期化
        await initializeSettings();
    }
});
