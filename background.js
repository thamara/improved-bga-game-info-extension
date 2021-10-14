'use strict';

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url.match(/https:\/\/boardgamearena.com\/gamepanel\?game=*/)) {
        chrome.tabs.executeScript(null, { file: "content.js" });
    }
});