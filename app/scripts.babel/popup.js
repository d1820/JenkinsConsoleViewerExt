/* eslint no-undef: 0 */
let isDevelopment = false;
chrome.management.getSelf(function (extInfo) {
  isDevelopment = extInfo.installType === "development";

  document.getElementById("consoleViewer").addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: "showConsoleViewer"
    }, function () {
      window.close();
    });
  });

  if (isDevelopment) {
    document.getElementById("mockJenkins").addEventListener("click", function () {
      chrome.runtime.sendMessage({
        action: "renderMock"
      }, () => { });
    });
  } else {
    document.getElementById("mockJenkins").remove();
  }

  document.getElementById("optionsView").addEventListener("click", function () {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("opions.html"));
    }
  });

  document.getElementById("bugFound").addEventListener("click", function () {
    chrome.runtime.sendMessage({
      action: "openInNewTab",
      data: { url: "https://github.com/d1820/JenkinsPlusExt/issues" }
    });
  });

});

Element.prototype.remove = function () {
  this.parentElement.removeChild(this);
};
