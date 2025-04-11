/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

const DEFAULT_SETTINGS = {
    iconDisplayDelay: 200,
    iconDisplayTime: 2000,
    iconDisplayOffsetX: -30,
    iconDisplayOffsetY: -30,
    frameDisplayDelay: 500,
    frameDisplayTime: 2000,
    frameUpdateTime: 200,
    bodyRightMarginWidthPx: 800,
    previewWidthPx: 800,
    ignoreXFrameOptions: false,
    ignoreContentSecurityPolicy: false,
    debugMode: false,
    urlFilterList: "", // 改行区切りの文字列リスト
    keepPreviewFrameOpen: false // プレビューを常に固定する
};