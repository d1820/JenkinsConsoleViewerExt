'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details);
});

chrome.browserAction.setBadgeText({text: '\Plus'});

console.log('\'Allo \'Allo! Event Page for Browser Action');
