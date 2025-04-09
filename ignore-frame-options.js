// https://addons.mozilla.org/ru/firefox/addon/ignore-x-frame-options/reviews/
// https://gist.github.com/dergachev/e216b25d9a144914eae2
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onHeadersReceived

function debugLog(message, data = null) {
    browser.storage.local.get("debugMode").then((settings) => {
        if (settings.debugMode) {
            console.log(message, data);
        }
    });
}

debugLog("ignore-frame-options.js is loaded");

let xFrameOptionsListener = null;
let contentSecurityPolicyListener = null;

// リスナーを登録する関数
function enableListeners() {
    browser.storage.local.get(["ignoreXFrameOptions", "ignoreContentSecurityPolicy"]).then((settings) => {
        if (settings.ignoreXFrameOptions && !xFrameOptionsListener) {
            debugLog("Enabling X-Frame-Options listener");
            xFrameOptionsListener = (details) => {
                debugLog("Intercepted headers (X-Frame-Options):", details.responseHeaders);
                const headers = details.responseHeaders.filter(
                    (header) => header.name.toLowerCase() !== "x-frame-options"
                );
                debugLog("Modified headers (X-Frame-Options):", headers);
                return { responseHeaders: headers };
            };
            browser.webRequest.onHeadersReceived.addListener(
                xFrameOptionsListener,
                { urls: ["<all_urls>"] },
                ["blocking", "responseHeaders"]
            );
        }

        if (settings.ignoreContentSecurityPolicy && !contentSecurityPolicyListener) {
            debugLog("Enabling Content-Security-Policy listener");
            contentSecurityPolicyListener = (details) => {
                debugLog("Intercepted headers (CSP):", details.responseHeaders);
                const headers = details.responseHeaders.filter(
                    (header) => header.name.toLowerCase() !== "content-security-policy"
                );
                debugLog("Modified headers (CSP):", headers);
                return { responseHeaders: headers };
            };
            browser.webRequest.onHeadersReceived.addListener(
                contentSecurityPolicyListener,
                { urls: ["<all_urls>"] },
                ["blocking", "responseHeaders"]
            );
        }
    });
}

// リスナーを解除する関数
function disableListeners() {
    if (xFrameOptionsListener) {
        debugLog("Disabling X-Frame-Options listener");
        browser.webRequest.onHeadersReceived.removeListener(xFrameOptionsListener);
        xFrameOptionsListener = null;
    }

    if (contentSecurityPolicyListener) {
        debugLog("Disabling Content-Security-Policy listener");
        browser.webRequest.onHeadersReceived.removeListener(contentSecurityPolicyListener);
        contentSecurityPolicyListener = null;
    }
}

// プレビュー機能の状態を監視
function updateListenersBasedOnSettings() {
    browser.storage.local.get(["ignoreXFrameOptions", "ignoreContentSecurityPolicy"]).then((settings) => {
        if (settings.ignoreXFrameOptions || settings.ignoreContentSecurityPolicy) {
            enableListeners();
        } else {
            disableListeners();
        }
    });
}

// 初期化時にリスナーを設定
updateListenersBasedOnSettings();

// 設定が変更されたときにリスナーを更新
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.ignoreXFrameOptions || changes.ignoreContentSecurityPolicy)) {
        updateListenersBasedOnSettings();
    }
});

