
// Import API config functions
import { hasApiKey } from './src/utils/api-config.js';

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const dashboardContainer = document.getElementById('dashboard-container');
  
  // Button visibility toggle elements
  const toggleButtonsBtn = document.getElementById('toggle-buttons');
  const toggleStatus = document.querySelector('.toggle-status');

  // Screenshot elements
  const screenshotButton = document.getElementById('screenshot-button');
  const screenshotArea = document.getElementById('screenshot-area');
  const questionTextArea = document.getElementById('question-text');
  const submitQuestionButton = document.getElementById('submit-question');
  const cancelScreenshotButton = document.getElementById('cancel-screenshot');
  const screenshotPreviewContainer = document.querySelector('.screenshot-preview-container');
  const screenshotPreview = document.getElementById('screenshot-preview');

  // Screenshot variables
  let screenshotData = null;
  
  // Make sure the dashboard is visible
  dashboardContainer.style.display = 'block';
  
  // Initialize the extension
  initExtension();

  // Button visibility toggle
  toggleButtonsBtn.addEventListener('click', () => {
    chrome.storage.local.get(['buttonsVisible'], (data) => {
      // Default to visible if not set
      const currentVisibility = data.buttonsVisible !== false;
      const newVisibility = !currentVisibility;
      
      chrome.storage.local.set({ buttonsVisible: newVisibility }, () => {
        updateToggleButtonText(newVisibility);
        
        // Send message to content scripts to update button visibility
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith('chrome://')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'updateButtonVisibility',
                visible: newVisibility
              }).catch(err => {
                console.log('Could not send message to content script');
              });
            }
          });
        });
      });
    });
  });
  
  // Update toggle button text based on current state
  function updateToggleButtonText(isVisible) {
    toggleButtonsBtn.textContent = isVisible ? 'Hide Buttons' : 'Show Buttons';
    toggleStatus.textContent = `Buttons are currently ${isVisible ? 'visible' : 'hidden'}`;
  }

  // Screenshot functionality
  screenshotButton.addEventListener('click', async () => {
    try {
      // Show the screenshot area
      screenshotArea.classList.remove('hidden');
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Capture the visible area of the tab
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        screenshotData = dataUrl;
        screenshotPreview.src = dataUrl;
        screenshotPreviewContainer.classList.remove('hidden');
      });
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  });
  
  // Handle question submission
  submitQuestionButton.addEventListener('click', async () => {
    try {
      const questionText = questionTextArea.value.trim();
      
      if (!questionText && !screenshotData) {
        alert('Please enter a question or take a screenshot');
        return;
      }
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send the question and screenshot data to the content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'processScreenshot',
        imageData: screenshotData,
        questionText: questionText
      }).catch(err => {
        console.error('Error sending message to content script:', err);
      });
      
      // Reset the screenshot tool
      resetScreenshotTool();
      
      // Close the popup
      window.close();
    } catch (error) {
      console.error('Error submitting question:', error);
    }
  });
  
  // Cancel screenshot button
  cancelScreenshotButton.addEventListener('click', () => {
    resetScreenshotTool();
  });
  
  function resetScreenshotTool() {
    screenshotArea.classList.add('hidden');
    questionTextArea.value = '';
    screenshotData = null;
    screenshotPreviewContainer.classList.add('hidden');
  }

  // Helper functions
  function initExtension() {
    // Check button visibility setting
    chrome.storage.local.get(['buttonsVisible'], (data) => {
      // Initialize button visibility if not set
      const visibility = data.buttonsVisible !== false;
      
      if (data.buttonsVisible === undefined) {
        chrome.storage.local.set({ buttonsVisible: true });
      }
      
      // Update toggle button text
      updateToggleButtonText(visibility);
    });
  }
});
