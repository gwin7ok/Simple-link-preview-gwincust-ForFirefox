/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// ローカルストレージに保存されるキーのプレフィックス
const STORAGE_PREFIX = "SLPGC_";

const SETTINGS = {
    iconDisplayDelay: { default: 200, elementId: "icon-display-delay", value: null },
    iconDisplayTime: { default: 2000, elementId: "icon-display-time", value: null },
    iconDisplayOffsetX: { default: -30, elementId: "icon-display-offset-x", value: null },
    iconDisplayOffsetY: { default: -30, elementId: "icon-display-offset-y", value: null },
    frameDisplayDelay: { default: 500, elementId: "frame-display-delay", value: null },
    frameDisplayTime: { default: 2000, elementId: "frame-display-time", value: null },
    frameUpdateTime: { default: 200, elementId: "frame-update-time", value: null },
    bodyRightMarginWidthPx: { default: 800, elementId: "body-right-margin-width-px", value: null },
    previewWidthPx: { default: 800, elementId: "preview-width-px", value: null },
    ignoreXFrameOptions: { default: false, elementId: "ignore-x-frame-options", value: null },
    ignoreContentSecurityPolicy: { default: false, elementId: "ignore-content-security-policy", value: null },
    debugMode: { default: false, elementId: "debug-mode", value: null },
    urlFilterList: { default: "", elementId: "url-filter-list", value: null }, // 改行区切りの文字列リスト
    keepPreviewFrameOpen: { default: false, elementId: "keep-preview-frame-open", value: null }, // プレビューを常に固定する
    previewEnabled: { default: true, elementId: "", value: null } // プレビュー機能の有効/無効
};


// ローカルストレージから設定値をロード
function loadSettings() {
    debugLog("ローカルストレージから設定をロードします。");
    return browser.storage.local.get(
        Object.fromEntries(
            Object.keys(SETTINGS).map(key => [`${STORAGE_PREFIX}${key}`, SETTINGS[key].default])
        )
    ).then((storedSettings) => {
        debugLog("ローカルストレージから取得した設定:", storedSettings);
        for (const [key, config] of Object.entries(SETTINGS)) {
            const prefixedKey = `${STORAGE_PREFIX}${key}`;
            let value = storedSettings[prefixedKey];

            // 型変換を適用
            if (typeof config.default === "boolean") {
                value = value === "true" || value === true;
            } else if (typeof config.default === "number") {
                value = Number(value);
            }

            config.value = value ?? config.default; // デフォルト値を適用
            debugLog(`設定された値: ${key} = ${config.value}`);
        }
        debugLog("設定がロードされました:", SETTINGS);
    }).catch((error) => {
        console.error("ローカルストレージからの設定読み込み中にエラーが発生しました:", error);
    });
}

// 設定値を更新する
function updateSetting(key, value) {
    if (SETTINGS[key]) {
        SETTINGS[key].value = value;
        const prefixedKey = `${STORAGE_PREFIX}${key}`;
        return browser.storage.local.set({ [prefixedKey]: value });
    }
    return Promise.reject(`Invalid setting key: ${key}`);
}

function debugLog(message, data = null) {
    if (SETTINGS.debugMode.value) {
        console.log(message, data);
    }
}