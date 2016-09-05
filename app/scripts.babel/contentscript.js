/* eslint no-undef: 0 */

class JPController {
  constructor(view, storage, runtime, templateService, messagingService) {
    this.view = view;
    this.storage = storage;
    this.runtime = runtime;
    this._templateService = templateService;
    this._jpConsoleOptions = {};
    this._jenkinsObserver = null;
    this._extensionInfo = null;
    this._messagingService = messagingService;
    this.jpDefaultOptions = {
      transparency: 0.9,
      theme: "jp-theme-dark",
      autoOpenConsole: false
    };
  }

  initalize() {
    const self = this;
    this.storage.sync.get(this.jpDefaultOptions, (options) => {
      self._jpConsoleOptions = options;
      if (options.autoOpenConsole) {
        self.runtime.sendMessage({
          action: "getExtensionInfo"
        }, (extInfo) => {
          self.extensionInfo = extInfo.data;
          self._showConsoleAndLoadIcons(self._isDevelopment());
        });
      }
    });

    this.storage.onChanged.addListener(function (changes) {
      for (const k in changes) {
        if (self._jpConsoleOptions.hasOwnProperty(k)) {
          self._jpConsoleOptions[k] = changes[k].newValue;
        }
      }
      //console.log(self._jpConsoleOptions);
      self._renderConsole(self._jpConsoleOptions, null, true);
    });

    this.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      self._extensionInfo = (request.extInfo ? request.extInfo : self._extensionInfo);
      switch (request.action) {
        case "showconsoleviewer":
          {
            if (self._showConsoleAndLoadIcons(self._isDevelopment(), sendResponse)) {
              break;
            }
            const err = self._createError("failure:notSuportedPage", "Not a supported page for the Jenkins Console Viewer");
            self._messagingService.warning(err.error);
            sendResponse(err);
            break;
          }

        case "rendermock": {
          self.view.createAndInjectMockJenkinsHtml(request.html, request.activeUrl);
          sendResponse({ status: "success" });
          break;
        }
        default:
          sendResponse(self._createError("failure:invalidAction", "Unknown action recieved in content script. Action: " + request.action));
          break;
      }
      return true;
    });
  }

  _showConsoleAndLoadIcons(isDevelopment, sendResponse) {
    if (this.view.hasJenkinsBuildLinks(isDevelopment)) {
      //we pass in so not to register multiple observers for same area
      this._jenkinsObserver = this._setupObserver(this._jenkinsObserver);
      this._injectConsoleIcons(isDevelopment, this._jenkinsObserver, this._jpConsoleOptions);
      this._renderConsole(this._jpConsoleOptions, this._jenkinsObserver).then(function () {
        sendResponse({ status: "success" });
      });
      return true;
    }
    //console.log("Not a supported page for the Jenkins Console Viewer");
    return false;
  }

  _createError(errorId, error) {
    return {
      status: "failure",
      errorId: errorId,
      error: error
    };
  }

  _isDevelopment() {
    return this._extensionInfo && this._extensionInfo.installType === "development";
  }

  _renderTab(consoleContainer, tabUrl, tabName) {
    const self = this;
    const newTabId = this.view.getNextTabId();

    this.view.clearSelectedTabs();

    const closeTabIcon = this.view.setupCloseTabIcon(newTabId);

    const saveMenuItem = this.view.setupSaveMenuItem(newTabId, (message) => {
      self._messagingService.error(message);
    });

    const copyMenuItem = this.view.setupCopyMenuItem(newTabId, (copiedText) => {
      self.runtime.sendMessage({
        action: "copyClipBoard",
        data: { innerText: copiedText }
      }, function (response) {
        if (response) {
          self._messagingService.info(response.status);
        }
      });
    }, (message) => {
      self._messagingService.error(message);
    });

    const openMenuItem = this.view.setupOpenMenuItem(() => {
      self.runtime.sendMessage({
        action: "openInNewTab",
        data: { url: tabUrl }
      });
    }, (message) => {
      self._messagingService.error(message);
    });

    this.view.createTab(newTabId, tabName, tabUrl, closeTabIcon, [saveMenuItem, copyMenuItem, openMenuItem]);

    this.view.setTabClickEvents();
  }

  _setTheme(consoleContainer, options) {
    consoleContainer.removeClass("jp-theme-dark");
    consoleContainer.removeClass("jp-theme-light");
    consoleContainer.addClass(options.theme);
  }

  _renderConsole(options, jenkinsJobWatcher, forceRedraw) {
    const self = this;
    const defered = this.view.createDeferred();
    const consoleContainer = this.view.getConsoleContainer();

    if (consoleContainer.length === 0 || forceRedraw) {
      this._templateService.getTemplate("/templates.html").then(function (templateHtml) {
        if (forceRedraw) {
          self.view.removeConsole();
        }
        self.view.setConsoleContainer(templateHtml);
        const newConsoleContainer = self.view.getConsoleContainer();
        self._setTheme(newConsoleContainer, options);
        self.view.setupConsoleContainerOnHover(options.transparency);
        self.view.setupConsoleContainerOnClose(() => {
          if (jenkinsJobWatcher) {
            jenkinsJobWatcher.disconnect();
          }
        });
        self.view.setTabClickEvents();
        self.view.setupConsoleContainerAsResizable();
        self.view.showNoTabsMessage();
        defered.resolve(newConsoleContainer);
      }).fail(function () {
        defered.reject();
      });
    } else {
      defered.resolve(consoleContainer);
    }
    return defered.promise();
  }

  _checkIfAlreadyOpen(consoleContainer, tabText) {
    const tabItems = this.view.getTabItems();
    for (let i = 0; i < tabItems.length; i++) {
      const obj = jQuery(tabs[i]);
      if (obj.text() === tabText) {
        return true;
      }
    }
    return false;
  }

  _injectConsoleIcons(isDevelopment, jenkinsJobWatcher, options) {
    const self = this;
    this.view.getJenkinsBuildJobs().each(function () {
      const iconContainer = self.view.getJenkinsIconContainer(this);
      if (self.view.hasConsoleIcon(this)) {
        return true;
      }
      const jenkinsConsoleIconObj = self.view.createJenkinsConsoleIcon(function () {
        const link = self.view.getJenkinsBuildLink(this);
        if (link.length > 0) {
          const gotoLink = link.prop("href");
          const linkText = link.text();
          if (gotoLink) {
            const consoleLink = gotoLink + (isDevelopment ? "" : "console");
            self._renderConsole(options, jenkinsJobWatcher).then(function (consoleContainer) {
              const isOpen = self._checkIfAlreadyOpen(consoleContainer, linkText);
              if (!isOpen) {
                self._renderTab(consoleContainer, consoleLink, linkText);
              }
            });
          }
        } else {
          self._messagingService.warning("Build not started...");
        }
      });

      iconContainer.append(jenkinsConsoleIconObj);
    });
  }

  _setupObserver(currentObserver) {
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


}

class JPView {
  constructor(jqueryyRef) {
    this.$ = jqueryyRef;
  }

  createDeferred() {
    return this.$.Deferred();
  }

  createAndInjectMockJenkinsHtml(html, currentUrl) {
    const self = this;
    const htmldoc = this.$(html);

    htmldoc.find(".build-name a").each(function () {
      self.$(this).prop("href", currentUrl);
    });
    //bind to buttons
    htmldoc.find("#insertMockPendingBtn").click(function () {
      const rows = self.$(".jp-mock-template .pane-content table tbody tr");
      rows.eq(0).after("<tr><td>insertMockPendingBtn</td></tr>");
    });
    htmldoc.find("#convertMockPendingToInprogressBtn").click(function () {
      console.log("convertMockPendingToInprogressBtn");
    });
    htmldoc.find("#insertMockProgressBtn").click(function () {
      const rows = self.$(".jp-mock-template .pane-content table tbody tr");
      rows.eq(0).after("<tr><td>insertMockProgressBtn</td></tr>");
    });
    this.$("body").append(htmldoc);
  }

  getJenkinsBuildJobs() {
    return this.$(".build-row-cell");
  }

  getJenkinsIconContainer(buildJob) {
    return this.$(buildJob).find(".build-controls .build-badge");
  }

  getJenkinsBuildLink(consoleIcon) {
    return this.$(consoleIcon).closest(".build-row-cell").find(".build-name .build-link");
  }

  createJenkinsConsoleIcon(onclickCallback) {
    const icon = this.$("<div class='jp-console-icon'><i title='Console'/></div>");
    icon.click(onclickCallback);
    return icon;
  }

  hasConsoleIcon(buildJob) {
    const iconContainer = this.getJenkinsIconContainer(buildJob);
    return iconContainer.find(".jp-console-icon").length > 0;
  }

  removeConsole() {
    this.$("#jp-console").remove();
  }
  hasJenkinsBuildLinks() {
    return this.$(".build-row-cell .build-controls .build-badge").length > 0;
  }
  clearSelectedTabs() {
    this.$("ul.jp-tabs li").removeClass("jp-current");
    this.$(".jp-tab-content").removeClass("jp-current");
  }

  getConsoleContainer() {
    return jQuery("body").find(".jp-console");
  }
  setConsoleContainer(templateHtml) {
    this.$("body").append(templateHtml);
    const containerHtml = jQuery("#jenkins-plus-tab-template").html();
    this.$("body").append(this.$(containerHtml));
  }

  setupConsoleContainerOnHover(transparency) {
    const self = this;
    const consoleContainer = this.getConsoleContainer();
    consoleContainer.hover(function () {
      self.$(this).fadeTo("fast", 1);
    }, function () {
      self.$(this).fadeTo("fast", transparency);
    });
  }

  setupConsoleContainerAsResizable() {
    const consoleContainer = this.getConsoleContainer();
    consoleContainer.resizable({
      handles: "n, e, s, w",
      minHeight: 270,
      minWidth: 700
    });
  }

  setupConsoleContainerOnClose(callback) {
    const consoleContainer = this.getConsoleContainer();
    consoleContainer.find("#jp-closebutton").click(function () {
      jQuery("#jp-console").remove();
      if (callback) {
        callback();
      }
    });
  }

  setTabClickEvents() {
    const self = this;
    const tabs = this.getTabItems();
    tabs.off("click");
    tabs.click(function () {
      const tabId = self.$(this).attr("data-tab");
      self.clearSelectedTabs();
      self.$(this).addClass("jp-current");
      self.$("#" + tabId).addClass("jp-current");
    });
  }

  createTab(newTabId, tabName, tabUrl, closeTabIcon, menuItems) {
    const consoleContainer = this.getConsoleContainer();
    const tabs = consoleContainer.find(".jp-tabs");
    const tab = jQuery(`<li class="jp-tab-link jp-current" data-tab="${newTabId}"><span><b>${tabName}</b><span></li>`);
    const tabContent = jQuery(`<div class="jp-outer-content" id="outer-${newTabId}">`);
    const tabContentInner = jQuery(`<div  class="jp-tab-content jp-current" id="${newTabId}">`);
    const menuItemContainer = jQuery("<div></div>");
    const iFrameHtml = jQuery(`<iframe width="100%" data-tab="${newTabId}" height="100%" frameborder="0" name="frame-${newTabId}" seamless src="${tabUrl}"></iframe>`);

    tab.append(closeTabIcon);
    tabs.append(tab);

    menuItems.forEach((menuItem) => {
      menuItemContainer.append(menuItem);
    });

    tabContentInner.append(menuItemContainer);
    tabContentInner.append(iFrameHtml);
    tabContent.append(tabContentInner);

    consoleContainer.append(tabContent);
  }

  getNextTabId() {
    const consoleContainer = this.getConsoleContainer();
    const tabs = consoleContainer.find(".jp-tabs");
    const currentTabCount = tabs.find(".jp-tab-link").length;
    return "tab-" + (currentTabCount + 1);
  }

  getTabItems() {
    const consoleContainer = this.getConsoleContainer();
    return consoleContainer.find(".jp-tabs li");
  }

  showNoTabsMessage() {
    const tabItems = this.getTabItems();
    this.$(".jp-no-tabs").hide();
    if (tabItems.length === 0) {
      this.$(".jp-no-tabs").show();
    }
  }


  setupCloseTabIcon(newTabId) {
    const self = this;
    const closeImage = self.$(`<i title="Close Tab" data-tab="${newTabId}" class="fa fa-close jp-icon-close-tab" />`);
    closeImage.click(function () {
      const tabId = self.$(this).attr("data-tab");
      self.$(this).parent().remove();
      self.$("#outer-" + tabId).remove();

      const tabsOpen = this.getTabItems();
      if (tabsOpen.length > 0 && self.$(this).parent().hasClass("jp-current")) {
        self.$(tabsOpen[0]).click();
      }

      self.showNoTabsMessage();
    });
    return closeImage;
  }
  setupSaveMenuItem(newTabId, onErrorCallback) {
    const self = this;
    const saveMenuItem = self.$("<i class='fa fa-save jp-menu-icon jp-icon-save' title='Save output' />");
    saveMenuItem.click(function () {
      try {
        window.frames[`frame-${newTabId}`].focus();
        window.frames[`frame-${newTabId}`].print();
      } catch (e) {
        if (onErrorCallback) {
          onErrorCallback("Unable to save console output. Error: " + e.message);
        }
      }
    });
    return saveMenuItem;
  }
  setupOpenMenuItem(onClickCallback, onErrorCallback) {
    const self = this;
    const openMenuItem = self.$("<i class='fa fa-share-square jp-menu-icon jp-icon-open' title='Open in new tab' />");
    openMenuItem.click(function () {
      try {
        if (onClickCallback) {
          onClickCallback();
        }
      } catch (e) {
        if (onErrorCallback) {
          onErrorCallback("Unable to open in new tab. Error: " + e.message);
        }
      }
    });
    return openMenuItem;
  }
  setupCopyMenuItem(newTabId, onClickCallback, onErrorCallback) {
    const self = this;
    const copyMenuItem = self.$("<i class='fa fa-clipboard jp-menu-icon jp-icon-copy' title='Copy to clipboard' />");
    copyMenuItem.click(function () {
      const iframe = self.$("iframe[data-tab='" + newTabId + "']");
      try {
        //TODO filter down to section of output only
        const body = iframe.contents().find("body");
        if (onClickCallback) {
          onClickCallback(body.text());
        }
      } catch (e) {
        if (onErrorCallback) {
          onErrorCallback("Unable to copy console output to clipboard. Error: " + e.message);
        }
      }
    });
    return copyMenuItem;
  }

}

class MessagingService {
  constructor(toastrRef) {
    this.toastr = toastrRef;
  }
  warning(message) {
    toastr.warning(message);
  }
  error(message) {
    toastr.error(message);
  }
  info(message) {
    toastr.info(message);
  }
}

class TemplateService {
  constructor(jqueryyRef, runtime) {
    this.$ = jqueryyRef;
    this.runtime = runtime;
    this._templates = [];
  }

  getTemplate(templateName) {
    const defered = this.$.Deferred();
    const match = this._templates.find((item) => {
      return item.name === templateName;
    });
    const self = this;
    if (!match) {
      this.$.ajax(
        {
          url: self.runtime.getURL(templateName),
          cache: true
        }).then((templateHtml) => {
          self._templates.push({ name: templateName, template: templateHtml });
          defered.resolve(templateHtml);
        });
    } else {
      defered.resolve(match.template);
    }
    return defered.promise();
  }
}

const _view = new JPView(jQuery);
const _messagingService = new MessagingService(toastr);
const _templateService = new TemplateService(jQuery, chrome.runtime);
const _controller = new JPController(_view, chrome.storage, chrome.runtime, _templateService, _messagingService);

_controller.initalize();