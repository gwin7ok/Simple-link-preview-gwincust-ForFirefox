/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// SETTINGS 定義
const SETTINGS = {
    iconDisplayDelay: { default: 200, elementId: "icon-display-delay", value: null },
    iconDisplayTime: { default: 2000, elementId: "icon-display-time", value: null },
    iconDisplayOffsetX: { default: -30, elementId: "icon-display-offset-x", value: null },
    iconDisplayOffsetY: { default: -30, elementId: "icon-display-offset-y", value: null },
    iconSize: { default: "small", elementId: "iconSize", value: "small" }, // アイコンサイズの設定
    frameDisplayDelay: { default: 500, elementId: "frame-display-delay", value: null },
    frameDisplayTime: { default: 2000, elementId: "frame-display-time", value: null },
    frameUpdateTime: { default: 500, elementId: "frame-update-time", value: null },
    bodyRightMarginWidthPx: { default: 800, elementId: "body-right-margin-width-px", value: null },
    previewWidthPx: { default: 800, elementId: "preview-width-px", value: null },
    ignoreXFrameOptions: { default: false, elementId: "ignore-x-frame-options", value: null },
    ignoreContentSecurityPolicy: { default: false, elementId: "ignore-content-security-policy", value: null },
    debugMode: { default: false, elementId: "debug-mode", value: null },
    urlFilterList: { 
        default: [".zip", ".pdf"], // 配列形式でデフォルト値を設定
        elementId: "url-filter-list", 
        value: null 
    },
    keepPreviewFrameOpen: { default: false, elementId: "keep-preview-frame-open", value: null }, // プレビューを常に固定する
    previewEnabled: { default: true, elementId: "", value: null }, // プレビュー機能の有効/無効
    customMarginSelectors: {
        elementId: "customMarginSelectors",
        value: null,
        default: ["youtube.com,#content", "x.com,#react-root"] // 配列形式でデフォルト値を設定
    }
};

// ローカルストレージから設定値をロード
function loadSettings() {
    debugLog("ローカルストレージから設定をロードします。");
    return browser.storage.local.get(
        Object.fromEntries(
            Object.keys(SETTINGS).map(key => [key, SETTINGS[key].default])
        )
    ).then((storedSettings) => {
        debugLog("ローカルストレージから取得した設定:", storedSettings);
        for (const [key, config] of Object.entries(SETTINGS)) {
            let value = storedSettings[key];

            // 型変換を適用
            if (typeof config.default === "boolean") {
                value = value === "true" || value === true;
            } else if (typeof config.default === "number") {
                value = Number(value);
            } else if (Array.isArray(config.default)) {
                // 配列型の場合、空文字列ならデフォルト値を適用
                if (typeof value === "string" && value.trim() === "") {
                    value = config.default;
                } else if (typeof value === "string") {
                    // 改行区切りの文字列を配列に変換
                    value = value.split("\n").map(item => item.trim()).filter(item => item);
                }
            }

            config.value = value ?? config.default; // デフォルト値を適用
            debugLog(`設定された値: ${key} = ${config.value}`);
        }
        debugLog("設定がロードされました:", SETTINGS);
    }).catch((error) => {
        console.error("[console()]ローカルストレージからの設定読み込み中にエラーが発生しました:", error);
    });
}

// 設定値を更新する
function updateSetting(key, value) {
    if (SETTINGS[key]) {
        SETTINGS[key].value = value;
        return browser.storage.local.set({ [key]: value });
    }
    return Promise.reject(`Invalid setting key: ${key}`);
}

function debugLog(message, data = null) {
    if (SETTINGS.debugMode?.value ?? false) {
        if (data !== null) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
}