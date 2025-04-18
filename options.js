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
                } else if (element.tagName === "TEXTAREA") {
                    // 配列を改行区切りの文字列に変換
                    element.value = (config.value || []).join("\n");
                } else if (element.tagName === "SELECT") {
                    // セレクトリストの値を設定
                    element.value = config.value ?? config.default;
                    debugLog(`設定中: ${key} (select) = ${element.value} (value: ${config.value}, default: ${config.default})`);
                } else {
                    element.value = config.value ?? config.default; // デフォルト値を適用
                    debugLog(`設定中: ${key} (input) = ${element.value} (value: ${config.value}, default: ${config.default})`);
                }
            } else {
                debugLog(`指定された ID の要素が見つかりませんでした: ${config.elementId}`);
            }
        }
    }).catch((error) => {
        console.error("設定のロード中にエラーが発生しました:", error);
    });
}

if (document.location.pathname.endsWith('options.html')) {
    console.log("[console()]options.html が読み込まれました。スクリプトを実行します。");

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
                } else if (element.tagName === "TEXTAREA") {
                    newValue = element.value.split("\n").map(line => line.trim()).filter(line => line); // 改行区切りでリスト化
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
                }).catch((error) => {
                    console.error(`設定の保存中にエラーが発生しました: ${key}`, error);
                });
            } else {
                debugLog(`指定された ID の要素が見つかりませんでした: ${config.elementId}`);
            }
        }

        // 通知を表示
        const notification = document.getElementById('notification');
        notification.textContent = "設定を保存しました。";
        notification.style.display = "block";

        // 数秒後に通知を非表示にする
        setTimeout(() => {
            notification.style.display = "none";
        }, 5000);
    });

    // 初期値に戻す
    document.getElementById('reset-settings').addEventListener('click', () => {
        for (const [key, config] of Object.entries(SETTINGS)) {
            if (!config.elementId) continue;

            const element = document.getElementById(config.elementId);
            if (element) {
                // 初期値をフォームに反映
                if (element.type === "checkbox") {
                    element.checked = config.default; // チェックボックスの場合
                } else if (element.tagName === "TEXTAREA") {
                    element.value = (config.default || []).join("\n"); // 配列を改行区切りの文字列に変換
                } else if (element.tagName === "SELECT") {
                    element.value = config.default; // セレクトボックスの場合
                } else {
                    element.value = config.default; // テキストや数値入力の場合
                }

                // デバッグログで初期値を確認
                debugLog(`初期値にリセット: ${key} = ${config.default}`);
            } else {
                debugLog(`指定された ID の要素が見つかりませんでした: ${config.elementId}`);
            }
        }

        // 通知を表示
        const notification = document.getElementById('notification');
        notification.textContent = "初期値に戻しましたが、保存されていません。";
        notification.style.display = "block";

        // 数秒後に通知を非表示にする
        setTimeout(() => {
            notification.style.display = "none";
        }, 5000);
    });
} else {
    debugLog("options.html 以外のページではスクリプトを実行しません。");
}
