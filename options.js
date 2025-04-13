/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

if (typeof SETTINGS === 'undefined') {
    console.error("SETTINGS が定義されていません。settings.js が正しく読み込まれているか確認してください。");
} else {
    console.log("SETTINGS が正しく読み込まれました:", SETTINGS);
}

debugLog("スクリプトが実行されました。設定をロードします。");

// 非同期関数を作成
async function initializeSettings() {
    await loadSettings().then(() => {
        debugLog("設定がロードされました:", SETTINGS);

        // 初期値をフォームに反映
        for (const [key, config] of Object.entries(SETTINGS)) {
            if (!config.elementId) {
                debugLog(`elementId が設定されていないためスキップされました: ${key}`);
                continue;
            }

            const element = document.getElementById(config.elementId);
            if (element) {
                if (element.type === "checkbox") {
                    element.checked = config.value ?? config.default; // デフォルト値を適用
                    debugLog(`設定中: ${key} (checkbox) = ${element.checked} (value: ${config.value}, default: ${config.default})`);
                } else {
                    element.value = config.value ?? config.default; // デフォルト値を適用
                    debugLog(`設定中: ${key} (input) = ${element.value} (value: ${config.value}, default: ${config.default})`);
                }
            } else {
                debugLog(`指定された ID の要素が見つかりませんでした: ${config.elementId}`);
            }
        }
    });
}

if (document.location.pathname.endsWith('options.html')) {
    console.log("options.html が読み込まれました。スクリプトを実行します。");

    // 初期化関数を呼び出す
    initializeSettings();

    // 設定を保存
    document.getElementById('save-settings').addEventListener('click', () => {
        for (const [key, config] of Object.entries(SETTINGS)) {
            if (!config.elementId) continue;

            const element = document.getElementById(config.elementId);
            if (element) {
                let newValue;

                // フォーム要素の値を取得
                if (element.type === "checkbox") {
                    newValue = element.checked; // チェックボックスの場合
                } else if (element.tagName === "SELECT") {
                    newValue = element.value; // セレクトボックスの場合
                } else {
                    newValue = element.value; // テキストや数値入力の場合
                }

                // デバッグログで値を確認
                debugLog(`取得した値: ${key} = ${newValue} (elementId: ${config.elementId})`);

                // 設定を更新
                updateSetting(key, newValue).then(() => {
                    debugLog(`設定を保存しました: ${key} = ${newValue}`);
                });
            } else {
                debugLog(`指定された ID の要素が見つかりませんでした: ${config.elementId}`);
            }
        }
    });
} else {
    debugLog("options.html 以外のページではスクリプトを実行しません。");
}
