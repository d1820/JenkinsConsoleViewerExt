/* eslint no-undef: 0 */

let _jpConsoleTemplate = null;
let _jpConsoleOptions = {};
let jenkinsObserver = null;
let _extensionInfo = null;

//keep these in sync with options.js
const jpDefaultOptions = {
  transparency: 0.9,
  theme: "jp-theme-dark",
  autoOpenConsole: false
};

chrome.storage.sync.get(jpDefaultOptions, (options) => {
  _jpConsoleOptions = options;

  if (options.autoOpenConsole) {
    chrome.runtime.sendMessage({
      action: "getExtensionInfo"
    }, (extInfo) => {
      _extensionInfo = extInfo.data;
      _showConsoleAndLoadIcons(_isDevelopment());
    });
  }
});

chrome.storage.onChanged.addListener(function (changes) {
  for (const k in changes) {
    if (_jpConsoleOptions.hasOwnProperty(k)) {
      _jpConsoleOptions[k] = changes[k].newValue;
    }
  }
  //console.log(_jpConsoleOptions);
  _renderConsole(_jpConsoleOptions, null, true);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  _extensionInfo = (request.extInfo ? request.extInfo : _extensionInfo);
  switch (request.action) {
    case "showconsoleviewer":
      {
        if (_showConsoleAndLoadIcons(_isDevelopment())) {
          break;
        }
        const err = _createError("failure:notSuportedPage", "Not a supported page for the Jenkins Console Viewer");
        toastr.warning(err.error);
        sendResponse(err);
        break;
      }

    case "rendermock": {
      const htmldoc = jQuery(request.html);
      htmldoc.find(".build-name a").each(function () {
        $(this).prop("href", request.activeUrl);
      });
      //bind to buttons
      htmldoc.find("#insertMockPendingBtn").click(function () {
        console.log("insertMockPendingBtn");
      });
      htmldoc.find("#convertMockPendingToInprogressBtn").click(function () {
        console.log("convertMockPendingToInprogressBtn");
      });
      htmldoc.find("#insertMockProgressBtn").click(function () {
        console.log("insertMockProgressBtn");
      });
      jQuery("body").append(htmldoc);
      sendResponse({ status: "success" });
      break;
    }
    default:
      sendResponse(_createError("failure:invalidAction", "Unknown action recieved in content script. Action: " + request.action));
      break;
  }
  return true;
});

function _showConsoleAndLoadIcons() {
  if (_hasJenkinsBuildLinks(isDevelopment)) {
    //we pass in so not to register multiple observers for same area
    jenkinsObserver = _setupObserver(jenkinsObserver);
    _injectConsoleIcons(isDevelopment, jenkinsObserver, _jpConsoleOptions);
    _renderConsole(_jpConsoleOptions, jenkinsObserver).then(function () {
      sendResponse({ status: "success" });
    });
    return true;
  }
  //console.log("Not a supported page for the Jenkins Console Viewer");
  return false;
}

function _createError(errorId, error) {
  return {
    status: "failure",
    errorId: errorId,
    error: error
  };
}

function _isDevelopment() {
  return _extensionInfo && _extensionInfo.installType === "development";
}

function _hasJenkinsBuildLinks() {
  return jQuery(".build-row-cell .build-controls .build-badge").length > 0;
}
function _clearSelectedTabs() {
  jQuery("ul.jp-tabs li").removeClass("jp-current");
  jQuery(".jp-tab-content").removeClass("jp-current");
}

function _showNoTabs(consoleContainer) {
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
  const closeTabIcon = _setupCloseTabIcon(newTabId, consoleContainer);
  const tab = jQuery(`<li class="jp-tab-link jp-current" data-tab="${newTabId}"><span><b>${tabName}</b><span></li>`);
  tab.append(closeTabIcon);
  tabs.append(tab);

  const tabContent = jQuery(`<div class="jp-outer-content" id="outer-${newTabId}">`);
  const tabContentInner = jQuery(`<div  class="jp-tab-content jp-current" id="${newTabId}">`);
  const menuItemContainer = jQuery("<div></div>");

  const saveMenuItem = _setupSaveMenuItem(newTabId);
  const copyMenuItem = _setupCopyMenuItem(newTabId);
  const openMenuItem = _setupOpenMenuItem();
  const iFrameHtml = jQuery(`<iframe width="100%" data-tab="${newTabId}" height="100%" frameborder="0" name="frame-${newTabId}" seamless src="${tabUrl}"></iframe>`);

  menuItemContainer.append(saveMenuItem);
  menuItemContainer.append(copyMenuItem);
  menuItemContainer.append(openMenuItem);
  tabContentInner.append(menuItemContainer);
  tabContentInner.append(iFrameHtml);
  tabContent.append(tabContentInner);

  consoleContainer.append(tabContent);
  _setTabClickEvents(consoleContainer);
}

function _setupCloseTabIcon(newTabId, consoleContainer) {
  const closeImage = jQuery(`<i title="Close Tab" data-tab="${newTabId}" class="fa fa-close jp-icon-close-tab" />`);
  closeImage.click(function () {
    const tabId = jQuery(this).attr("data-tab");
    jQuery(this).parent().remove();
    jQuery("#outer-" + tabId).remove();

    const tabsOpen = consoleContainer.find(".jp-tabs li");
    if (tabsOpen.length > 0 && jQuery(this).parent().hasClass("jp-current")) {
      $(tabsOpen[0]).click();
    }

    _showNoTabs(consoleContainer);
  });
  return closeImage;
}
function _setupSaveMenuItem(newTabId) {
  const saveMenuItem = jQuery("<i class='fa fa-save jp-menu-icon jp-icon-save' title='Save output' />");
  saveMenuItem.click(function () {
    try {
      window.frames[`frame-${newTabId}`].focus();
      window.frames[`frame-${newTabId}`].print();
    } catch (e) {
      toastr.error("Unable to save console output. Error: " + e.message);
    }
  });
  return saveMenuItem;
}
function _setupOpenMenuItem() {
  const openMenuItem = jQuery("<i class='fa fa-share-square jp-menu-icon jp-icon-open' title='Open in new tab' />");
  openMenuItem.click(function () {
    try {
      chrome.runtime.sendMessage({
        action: "openInNewTab",
        data: { url: tabUrl }
      });
    } catch (e) {
      toastr.error("Unable to open in new tab. Error: " + e.message);
    }
  });
  return openMenuItem;
}
function _setupCopyMenuItem(newTabId) {
  const copyMenuItem = jQuery("<i class='fa fa-clipboard jp-menu-icon jp-icon-copy' title='Copy to clipboard' />");
  copyMenuItem.click(function () {
    const iframe = jQuery("iframe[data-tab='" + newTabId + "']");
    try {
      //TODO filter down to section of output only
      const body = iframe.contents().find("body");
      chrome.runtime.sendMessage({
        action: "copyClipBoard",
        data: { innerText: body.text() }
      }, function (response) {
        if (response) {
          toastr.info(response.status);
        }
      });
    } catch (e) {
      toastr.error("Unable to copy console output to clipboard. Error: " + e.message);
    }
  });
  return copyMenuItem;
}

function _setTabClickEvents(consoleContainer) {
  const tabs = consoleContainer.find(".jp-tabs li");
  tabs.off("click");
  tabs.click(function () {
    const tabId = jQuery(this).attr("data-tab");
    console.log(tabId);
    _clearSelectedTabs();

    jQuery(this).addClass("jp-current");
    jQuery("#" + tabId).addClass("jp-current");
  });
}

function _downloadTemplate() {
  const defered = jQuery.Deferred();
  if (!_jpConsoleTemplate) {
    jQuery.ajax(
      {
        url: chrome.extension.getURL("/templates.html"),
        cache: true
      }).then((templateHtml) => {
        _jpConsoleTemplate = templateHtml;
        defered.resolve(templateHtml);
      });
  } else {
    defered.resolve(_jpConsoleTemplate);
  }
  return defered.promise();
}

function _setTheme(consoleContainer, options) {
  consoleContainer.removeClass("jp-theme-dark");
  consoleContainer.removeClass("jp-theme-light");
  consoleContainer.addClass(options.theme);
}

function _renderConsole(options, jenkinsJobWatcher, forceRedraw) {
  const defered = jQuery.Deferred();

  const consoleContainer = jQuery("body").find(".jp-console");
  if (consoleContainer.length === 0 || forceRedraw) {
    _downloadTemplate().then(function (templateHtml) {

      jQuery("body").append(templateHtml);
      const containerHtml = jQuery("#jenkins-plus-tab-template").html();
      const newConsoleContainer = jQuery(containerHtml);
      _setTheme(newConsoleContainer, options);
      newConsoleContainer.hover(function () {
        $(this).fadeTo("fast", 1);
      }, function () {
        $(this).fadeTo("fast", options.transparency);
      });

      newConsoleContainer.find("#jp-closebutton").click(function () {
        jQuery("#jp-console").remove();
        if (jenkinsJobWatcher) {
          jenkinsJobWatcher.disconnect();
        }
      });

      _setTabClickEvents(newConsoleContainer);
      newConsoleContainer.resizable({
        handles: "n, e, s, w",
        minHeight: 270,
        minWidth: 700
      });
      if (forceRedraw) {
        jQuery("#jp-console").remove();
      }
      jQuery("body").append(newConsoleContainer);
      _showNoTabs(newConsoleContainer);
      defered.resolve(newConsoleContainer);
    }).fail(function () {
      defered.reject();
    });
  } else {
    defered.resolve(consoleContainer);
  }
  return defered.promise();
}

function _checkIfAlreadyOpen(consoleContainer, tabText) {
  const tabs = consoleContainer.find(".jp-tabs li");
  for (let i = 0; i < tabs.length; i++) {
    const obj = jQuery(tabs[i]);
    if (obj.text() === tabText) {
      return true;
    }
  }
  return false;
}

function _injectConsoleIcons(isDevelopment, jenkinsJobWatcher, options) {
  jQuery(".build-row-cell").each(function () {
    const container = jQuery(this).find(".build-controls .build-badge");
    if (container.find(".jp-console-icon").length > 0) {
      return true;
    }
    const htmlObj = jQuery("<div class='jp-console-icon'><i title='Console'/></div>");
    htmlObj.click(function () {
      const link = jQuery(this).closest(".build-row-cell").find(".build-name .build-link");
      if (link.length > 0) {
        const gotoLink = link.prop("href");
        const linkText = link.text();

        if (gotoLink) {
          const consoleLink = gotoLink + (isDevelopment ? "" : "console");
          _renderConsole(options, jenkinsJobWatcher).then(function (consoleContainer) {
            const isOpen = _checkIfAlreadyOpen(consoleContainer, linkText);
            if (!isOpen) {
              _renderTab(consoleContainer, consoleLink, linkText);
            }
          });
        }
      } else {
        toastr.warning("Build not started...");
      }
    });
    container.append(htmlObj);
  });
}

function _setupObserver(currentObserver) {
  if (currentObserver) {
    currentObserver.disconnect();
  }
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
  let observer = null;
  const container = $(".build-row:first").parent();
  if (container.length > 0) {
    const containerNode = container[0];

    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {

        const entry = {
          mutation: mutation,
          el: mutation.target,
          value: mutation.target.textContent,
          oldValue: mutation.oldValue
        };
        console.log("Recording mutation:", entry);


        // if (mutation.type === 'childList') {
        //   var list_values = [].slice.call(list.children)
        //     .map(function (node) { return node.innerHTML; })
        //     .filter(function (s) {
        //       if (s === '<br>') {
        //         return false;
        //       }
        //       else {
        //         return true;
        //       }
        //     });
        //   console.log(list_values);
        // }


        // childList: *true if mutations to children are to be observed
        // attributes: true if mutations to attributes are to be observed
        // characterData: true if data is to be observed
        // subtree: true if mutations to both the target and descendants are to be observed
        // attributeOldValue: true if attributes is true & attribute value prior to mutation needs recording
        // characterDataOldValue: true if characterData is true & data before mutations needs recording
        // attributeFilter: an array of local attribute names if not all attribute mutations need recording

      });

    });

    console.log("observer created");

    observer.observe(containerNode, {
      attributes: true,
      childList: true,
      characterData: true
    });

  }
  return observer;



}
