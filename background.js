
// Import API config
import { hasApiKey } from './src/utils/api-config.js';

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
  console.log('QuizGenius extension installed or updated');
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Check if API key is set
    hasApiKey().then(hasKey => {
      // Send message to content script with auth status
      chrome.tabs.sendMessage(tabId, { 
        action: 'checkAuthStatus',
        hasApiKey: hasKey
      }).catch(err => {
        // It's normal for this to fail on pages where content script isn't loaded
        console.log('Could not send message to content script');
      });
    });
  }
});
