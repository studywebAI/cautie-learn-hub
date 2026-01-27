// StudyWeb Capture Extension Popup
document.addEventListener('DOMContentLoaded', function() {
  const capturePageBtn = document.getElementById('capture-page');
  const captureSelectionBtn = document.getElementById('capture-selection');
  const addToAgendaBtn = document.getElementById('add-to-agenda');
  const statusDiv = document.getElementById('status');

  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Capture entire page content
  capturePageBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Get page content via content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          return {
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.substring(0, 5000), // First 5000 chars
            selectedText: window.getSelection().toString()
          };
        }
      });

      const pageData = results[0].result;

      // Send to StudyWeb API
      await saveToStudyWeb({
        type: 'page_capture',
        title: pageData.title,
        content: pageData.content,
        url: pageData.url,
        source: 'browser_extension'
      });

      showStatus('Page saved to StudyWeb!');
    } catch (error) {
      console.error('Capture failed:', error);
      showStatus('Failed to save page', 'error');
    }
  });

  // Capture selected text
  captureSelectionBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const selectedText = window.getSelection().toString();
          if (!selectedText) {
            throw new Error('No text selected');
          }
          return {
            title: `Selected text from ${document.title}`,
            content: selectedText,
            url: window.location.href
          };
        }
      });

      const selectionData = results[0].result;

      await saveToStudyWeb({
        type: 'text_selection',
        title: selectionData.title,
        content: selectionData.content,
        url: selectionData.url,
        source: 'browser_extension'
      });

      showStatus('Selection saved to StudyWeb!');
    } catch (error) {
      console.error('Selection capture failed:', error);
      showStatus('No text selected or capture failed', 'error');
    }
  });

  // Add current page to agenda
  addToAgendaBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          return {
            title: document.title,
            url: window.location.href,
            description: `Saved from browser: ${document.title}`
          };
        }
      });

      const pageData = results[0].result;

      await saveToStudyWeb({
        type: 'agenda_item',
        title: `Review: ${pageData.title}`,
        description: pageData.description,
        url: pageData.url,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        source: 'browser_extension'
      });

      showStatus('Added to StudyWeb agenda!');
    } catch (error) {
      console.error('Agenda addition failed:', error);
      showStatus('Failed to add to agenda', 'error');
    }
  });

  // Helper function to save to StudyWeb
  async function saveToStudyWeb(data) {
    // Get stored API credentials
    const { studyWebToken, studyWebUrl } = await chrome.storage.sync.get([
      'studyWebToken',
      'studyWebUrl'
    ]);

    if (!studyWebToken || !studyWebUrl) {
      throw new Error('StudyWeb not configured. Please set up your credentials in the extension options.');
    }

    const response = await fetch(`${studyWebUrl}/api/extension/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studyWebToken}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save to StudyWeb');
    }

    return response.json();
  }
});