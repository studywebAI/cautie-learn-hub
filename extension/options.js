// Options page for StudyWeb Capture Extension
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('settings-form');
  const studyWebUrlInput = document.getElementById('studyWebUrl');
  const studyWebTokenInput = document.getElementById('studyWebToken');
  const statusDiv = document.getElementById('status');

  // Load existing settings
  chrome.storage.sync.get(['studyWebUrl', 'studyWebToken'], function(result) {
    if (result.studyWebUrl) {
      studyWebUrlInput.value = result.studyWebUrl;
    }
    if (result.studyWebToken) {
      studyWebTokenInput.value = result.studyWebToken;
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const studyWebUrl = studyWebUrlInput.value.trim();
    const studyWebToken = studyWebTokenInput.value.trim();

    if (!studyWebUrl || !studyWebToken) {
      showStatus('Please fill in both fields', 'error');
      return;
    }

    // Validate URL
    try {
      new URL(studyWebUrl);
    } catch {
      showStatus('Please enter a valid URL', 'error');
      return;
    }

    // Test the connection
    testConnection(studyWebUrl, studyWebToken)
      .then(() => {
        // Save settings
        chrome.storage.sync.set({
          studyWebUrl: studyWebUrl,
          studyWebToken: studyWebToken
        }, function() {
          showStatus('Settings saved successfully!', 'success');
        });
      })
      .catch(error => {
        showStatus(`Connection test failed: ${error.message}`, 'error');
      });
  });

  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    }
  }

  async function testConnection(url, token) {
    try {
      const response = await fetch(`${url}/api/extension/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'connection_test',
          title: 'Connection Test',
          content: 'Testing browser extension connection',
          source: 'extension_test'
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API token');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to StudyWeb server');
      }
      throw error;
    }
  }
});