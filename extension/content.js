// Content script for StudyWeb Capture Extension
// This runs on web pages to enable content capture

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText,
      selectedText: window.getSelection().toString(),
      metadata: {
        description: getMetaDescription(),
        keywords: getMetaKeywords(),
        author: getMetaAuthor()
      }
    };

    sendResponse(content);
  }

  return true; // Keep message channel open for async response
});

// Helper functions to extract metadata
function getMetaDescription() {
  const meta = document.querySelector('meta[name="description"]');
  return meta ? meta.getAttribute('content') : '';
}

function getMetaKeywords() {
  const meta = document.querySelector('meta[name="keywords"]');
  return meta ? meta.getAttribute('content') : '';
}

function getMetaAuthor() {
  const meta = document.querySelector('meta[name="author"]');
  return meta ? meta.getAttribute('content') : '';
}

// Add context menu integration (advanced feature)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToStudyWeb',
    title: 'Save to StudyWeb',
    contexts: ['selection', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveToStudyWeb') {
    // Handle context menu clicks
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuSave',
      selection: info.selectionText,
      pageUrl: info.pageUrl
    });
  }
});