// Background script for StudyWeb Capture Extension
// Handles extension lifecycle and API communications

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('StudyWeb Capture Extension installed');

    // Set default settings
    chrome.storage.sync.set({
      studyWebUrl: 'https://your-studyweb-domain.com',
      studyWebToken: null
    });
  }
});

// Handle extension icon clicks (fallback)
chrome.action.onClicked.addListener((tab) => {
  // Could open a simplified interface here
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html')
  });
});

// API communication helper
async function makeAPIRequest(endpoint, data) {
  const { studyWebUrl, studyWebToken } = await chrome.storage.sync.get([
    'studyWebUrl',
    'studyWebToken'
  ]);

  if (!studyWebToken) {
    throw new Error('StudyWeb not configured');
  }

  const response = await fetch(`${studyWebUrl}/api/extension/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studyWebToken}`,
      'X-Extension-Version': chrome.runtime.getManifest().version
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

// Export for use in other parts of extension
window.makeAPIRequest = makeAPIRequest;