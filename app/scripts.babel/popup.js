'use strict';

document.getElementById('testbutton').addEventListener('click', function () {
    chrome.extension.sendMessage({
        action: "showconsole"
    });
});


var vsopopout = vsopopout || (function () {




    // An object that will contain the "methods"
    // we can use from our event script.
    var methods = {};
    var templatedata = null;
    var pageContainer = ".main-container";
    var toolbarContainer = "#page-vsoext-toolbar-container";
    // This method will eventually return
    // background colors from the current page.
    methods.showVsoExtenstion = function () {

        // if (!templatedata) {
        //     $.ajax(
        //     {
        //         url: chrome.extension.getURL('/vsopopout.html'),
        //         cache: false,
        //         success: function (data) {
        //             templatedata = data;
        //             if ($(pageContainer).length > 0) {
        //                 $(pageContainer).before($(data));
        //             }
        //             _resolveContainerItems();
        //         }
        //     });
        // } else {
        //     _removeToolbar();
        //     $(pageContainer).before($(templatedata));
        //     _resolveContainerItems();
        // }

    };

    methods.showOptions = function () {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL("opions.html"));
        }
    };



    function _resolveContainerItems() {
        $(pageContainer).addClass("main-container-offset");
        $("#page-vsoext-toolbar-close").click(function () {
            _removeToolbar();
            chrome.runtime.sendMessage({ method: "setState", data: false });
        }).attr("src", chrome.extension.getURL("images/close.png"));

        var showmyvsotasksButton = document.getElementById('showmyvsotasks');
        showmyvsotasksButton.removeEventListener('click');
        showmyvsotasksButton.addEventListener('click', _showVsoTask, false);

        var addtaskButton = document.getElementById('addtask');
        addtaskButton.removeEventListener('click');
        addtaskButton.addEventListener('click', _showAddTask, false);
    }

    function _enableKeyIndenting() {
        vsoKeyIndentingTemplate();
    }

    function _showVsoTask() {

        if (!_checkUrl()) {
            return;
        }
        vsoextShowMyVsoTasks();

    }

    function _showAddTask() {
        if (!_checkUrl()) {
            return;
        }
        vsoExtShowAddTask();

    }


    function _checkUrl() {
        // if (window.location.href.indexOf("visualstudio.com") === -1) {
        //     alert("Extension can only run when Visual Studio Online is the active tab");
        //     return false;
        // }
        return true;
    }
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var data = {};
        // If the method the extension has requested
        // exists, call it and assign its response
        // to data.
        console.log(request);
        if (methods.hasOwnProperty(request.method))
            data = methods[request.method]();
        // Send the response back to our extension.
        sendResponse({ data: data });
        return true;
    });

    return true;
})();

