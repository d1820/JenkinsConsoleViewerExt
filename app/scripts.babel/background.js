'use strict';

chrome.runtime.onInstalled.addListener(details => {
    console.log('previousVersion', details);
});

var vsoShowing = false;
chrome.browserAction.onClicked.addListener(tab => {

    injectedMethod(tab, 'showVsoExtenstion', function (response) {
        vsoShowing = true;
        return true;
    });

    var methods = {

    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("in background onMessage");
        if (methods.hasOwnProperty(request.method)) {
            methods[request.method](request.data);
        }

        return true;
    });

});

function injectedMethod(tab, method, callback) {
    chrome.tabs.sendMessage(tab.id, { method: method }, callback);
}

chrome.browserAction.setBadgeText({ text: '\Plus' });
