// https://addons.mozilla.org/ru/firefox/addon/ignore-x-frame-options/reviews/
// https://gist.github.com/dergachev/e216b25d9a144914eae2
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
console.log("ignore-frame-options.js is loaded");

let xFrameOptionsListener = null;
let contentSecurityPolicyListener = null;

// リスナーを登録する関数
function enableListeners() {
    if (!xFrameOptionsListener) {
        console.log("Enabling X-Frame-Options listener");
        xFrameOptionsListener = (details) => {
            console.log("Intercepted headers:", details.responseHeaders);
            const headers = details.responseHeaders.filter(
                (header) => header.name.toLowerCase() !== "x-frame-options"
            );
            console.log("Modified headers:", headers);
            return { responseHeaders: headers };
        };
        browser.webRequest.onHeadersReceived.addListener(
            xFrameOptionsListener,
            { urls: ["<all_urls>"] },
            ["blocking", "responseHeaders"]
        );
    }
}

// リスナーを解除する関数
function disableListeners() {
    if (xFrameOptionsListener) {
        console.log("Disabling X-Frame-Options listener");
        browser.webRequest.onHeadersReceived.removeListener(xFrameOptionsListener);
        xFrameOptionsListener = null;
    }
}

// プレビュー機能の状態を監視
function updateListenersBasedOnPreviewEnabled() {
    console.log("updateListenersBasedOnPreviewEnabled is called");
    browser.storage.local.get("previewEnabled").then((data) => {
        if (data.previewEnabled) {
            enableListeners();
        } else {
            disableListeners();
        }
    });
}

// 初期化時に状態を確認してリスナーを設定
updateListenersBasedOnPreviewEnabled();

// 設定が変更されたときにリスナーを更新
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.previewEnabled) {
        updateListenersBasedOnPreviewEnabled();
    }
});

