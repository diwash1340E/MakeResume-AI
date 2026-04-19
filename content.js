// content.js - Scraping logic for Job Descriptions

function extractJobDescription() {
  // Common selectors for popular job boards
  const selectors = [
    '#job-details', // LinkedIn
    '#jobDescriptionText', // Indeed
    '#content .app-body', // Greenhouse
    '.job-description', // Common class
    'article' // Generic
  ];

  let jobText = '';

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      jobText = element.innerText;
      break;
    }
  }

  return jobText || document.body.innerText; // Fallback
}

// Listen for messages from the extension sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCRAPE_JD") {
    sendResponse({ success: true, text: extractJobDescription() });
  }
});