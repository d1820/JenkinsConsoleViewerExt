chrome.runtime.onInstalled.addListener(details => {
  console.log("previousVersion", details);
  //get info from local storage
});

const methods = {
  copyClipBoard: () => { console.log("copy called"); },
  saveHtml: () => { console.log("save called"); },
  renderMock: (sendResponse) => {
    chrome.tabs.query({ active: true }, function (tabs) {
      const activeTab = tabs[0];
      getMockHtml().then((html) => {
        chrome.tabs.sendMessage(activeTab.id, {
          action: "rendermock",
          html: html,
          activeUrl: activeTab.url
        }, (response) => {
          sendResponse(response);
        });
      });
    });
  },
  showConsoleViewer: (sendResponse) => {
    chrome.tabs.query({ active: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.management.getSelf(function (extInfo) {
        chrome.tabs.sendMessage(activeTab.id, {
          action: "showconsoleviewer",
          extInfo: extInfo
        }, (response) => {
          sendResponse(response);
        });
      });
    });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (methods.hasOwnProperty(request.action)) {
    methods[request.action](sendResponse);
  } else {
    sendResponse({ status: "failure", errorId: "failure:unknownRrequestAction", error: "Not a supported request action for Jenkins Plus. Action: " + request.action });
  }
  return true;
});


chrome.browserAction.setBadgeText({ text: "\Plus" });


function getMockHtml() {
  return jQuery.ajax(
    {
      url: chrome.extension.getURL("/mock.html"),
      cache: false
    });
}
