chrome.runtime.onInstalled.addListener(details => {
  console.log("previousVersion", details);
  //get info from local storage
});

const methods = {
  copyClipBoard: () => { console.log("copy called"); },
  saveHtml: () => { console.log("save called"); },
  renderMock: () => {
    chrome.tabs.query({ active: true }, function (tabs) {
      const activeTab = tabs[0];
      getMockHtml().then((html) => {
        chrome.tabs.sendMessage(activeTab.id, {
          action: "rendermock",
          html: html
        }, (response) => {
          console.log(response);
        });
      });

    });
  },
  showConsoleViewer: () => {
    chrome.tabs.query({ active: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        action: "showconsoleviewer"
      }, (response) => {
        console.log(response);
      });
    });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (methods.hasOwnProperty(request.action)) {
    methods[request.action](request.data);
  }
  sendResponse({ data: "success:background" });
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
