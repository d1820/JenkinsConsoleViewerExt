document.getElementById("consoleViewer").addEventListener("click", function () {
  chrome.runtime.sendMessage({
    action: "showConsoleViewer"
  },
    function (response) {
      //TODO: write error to popup
      console.log(response);
      window.close();
    });
});

document.getElementById("mockJenkins").addEventListener("click", function () {
  chrome.runtime.sendMessage({
    action: "renderMock"
  },
    function (response) {
      //TODO: write error to popup
      console.log(response);
    });
});

document.getElementById("optionsView").addEventListener("click", function () {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("opions.html"));
  }
});
