chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //console.log(sender.tab ?     "from a content script:" + sender.tab.url :    "from the extension");
  switch (request.action) {
    case "showconsoleviewer":
      _injectConsoleIcons();
      _renderConsole();
      sendResponse({ data: "success:consoleIconsRendered" });
      break;
    case "rendermock":
      jQuery("body").append(request.html);
      sendResponse({ data: "success:mockHtmlRendered" });
      break;
    default:
      sendResponse({ data: "failure:Invalid Action:" + request.action });
      break;
  }
  return true;
});

function _clearSelectedTabs() {
  jQuery("ul.jp-tabs li").removeClass("jp-current");
  jQuery(".jp-tab-content").removeClass("jp-current");
}

function showNoTabs(consoleContainer) {
  const tabItems = consoleContainer.find(".jp-tabs li");
  jQuery(".jp-no-tabs").hide();
  if (tabItems.length === 0) {
    jQuery(".jp-no-tabs").show();
  }
}

function _renderTab(consoleContainer, tabUrl, tabName) {
  const tabs = consoleContainer.find(".jp-tabs");
  const currentTabCount = tabs.find(".jp-tab-link").length;
  const newTabId = "tab-" + (currentTabCount + 1);

  //clear all selected tabs
  _clearSelectedTabs();

  const closeImage = jQuery('<i title="Close Tab" data-tab="' + newTabId + '" class="jp-icon-close-tab" />');
  closeImage.click(function () {
    const tabId = jQuery(this).attr("data-tab");
    jQuery(this).parent().remove();
    jQuery("#outer-" + tabId).remove();
    showNoTabs(consoleContainer);
  });
  const tab = jQuery('<li class="jp-tab-link jp-current" data-tab="' + newTabId + '"><span>' + tabName + '<span></li>');
  tab.append(closeImage);
  tabs.append(tab);

  const tabContent = jQuery('<div class="jp-outer-content" id="outer-' + newTabId + '">');
  const tabContentInner = jQuery('<div  class="jp-tab-content jp-current" id="' + newTabId + '">');
  const menuItemContainer = jQuery("<div></div>");
  const saveMenuItem = jQuery('<i class="jp-menu-icon jp-icon-save" title="Save output" />');
  saveMenuItem.click(function () {
    const iframe = jQuery("iframe[data-tab='" + newTabId + "']");
    chrome.extension.sendMessage({
      action: "copyClipBoard",
      data: iframe.prop("src")
    });
  });
  const copyMenuItem = jQuery('<i class="jp-menu-icon jp-icon-copy" title="Copy to clipboard" />');
  copyMenuItem.click(function () {
    const iframe = jQuery("iframe[data-tab='" + newTabId + "']");
    chrome.extension.sendMessage({
      action: "saveHtml",
      data: iframe.prop("src")
    });
  });
  const iFrameHtml = jQuery('<iframe width="100%" data-tab="' + newTabId + '" height="100%" frameborder="0" seamless src="' + tabUrl + '"></iframe>');

  menuItemContainer.append(saveMenuItem);
  menuItemContainer.append(copyMenuItem);
  tabContentInner.append(menuItemContainer);
  tabContentInner.append(iFrameHtml);
  tabContent.append(tabContentInner);

  consoleContainer.append(tabContent);
  _setTabClickEvents(consoleContainer);
}

function _setTabClickEvents(consoleContainer) {
  const tabs = consoleContainer.find(".jp-tabs li");
  tabs.off("click");
  tabs.click(function () {
    const tab_id = jQuery(this).attr("data-tab");
    console.log(tab_id);
    _clearSelectedTabs();

    jQuery(this).addClass("jp-current");
    jQuery("#" + tab_id).addClass("jp-current");
  });
}


let _templatesAppended = false;
function _renderConsole() {
  let consoleContainer = jQuery("body").find(".jp-console");
  if (consoleContainer.length === 0) {
    jQuery.ajax(
      {
        url: chrome.extension.getURL("/templates.html"),
        cache: true
      }).then((templateHtml) => {
        if (!_templatesAppended) {
          _templatesAppended = true;
          jQuery("body").append(templateHtml);
        }
        const containerHtml = jQuery("#jenkins-plus-tab-template").html();
        consoleContainer = jQuery(containerHtml);
        consoleContainer.find("#jp-closebutton").click(function () {
          jQuery("#jp-console").remove();
        });
        _setTabClickEvents(consoleContainer);
        consoleContainer.resizable({
          handles: "n, e, s, w",
          minHeight: 270,
          minWidth: 700
        });
        jQuery("body").append(consoleContainer);
        showNoTabs(consoleContainer);
      });
  }
  return consoleContainer;
}

function _checkIfAlreadyOpen(consoleContainer, tabText) {
  const tabs = consoleContainer.find(".jp-tabs li");
  for (let i = 0; i < tabs.length; i++) {
    const obj = jQuery(tabs[i]);
    if (obj.text() == tabText) {
      return true;
    }
  }
  return false;
}
let _consoleIconsRendered = false;

function _injectConsoleIcons() {
  if (_consoleIconsRendered)
  {
    //return;
  }
  jQuery(".build-row-cell").each(() => {
    const htmlObj = jQuery("<div class='jp-console-icon'><i title='Console'/></div>");
    
    htmlObj.click(function () {
      const link = jQuery(this).closest(".build-row-cell").find(".build-name .build-link");
      if (link.length > 0) {
        const gotoLink = link.prop("href");
        const linkText = link.text();

        if (gotoLink) {
          const consoleLink = gotoLink + "console";
          const consoleContainer = _renderConsole();
          const isOpen = _checkIfAlreadyOpen(consoleContainer, linkText);
          if (!isOpen) {
            _renderTab(consoleContainer, consoleLink, linkText);
          }
        }
      } else {
        alert("Build not started...");
      }
    });
    
    //TODO: check for icon already there
    jQuery(this).find(".build-controls .build-badge").append(htmlObj);
    _consoleIconsRendered = true;
  });
}

