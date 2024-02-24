'use strict';

const filter = {
    url: [{ hostContains: "boardgamearena.com" }, { pathEquals: "gamepanel" }, { queryContains: "game" }],
};

async function logOnHistoryStateUpdated(details) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ["content.js"]
    });
    chrome.scripting.insertCSS({
        target: { tabId: details.tabId },
        files: ["styles.css"]
    });
}

chrome.webNavigation.onHistoryStateUpdated.addListener(
    logOnHistoryStateUpdated,
    filter
);