import React, { useState, useEffect } from 'react'

function computeMatchScore(jd, resume) {
  if (!jd || !resume) return 0
  const jdWords = new Set((jd.match(/\b\w+\b/g) || []).map(w => w.toLowerCase()))
  const resumeWords = new Set((resume.match(/\b\w+\b/g) || []).map(w => w.toLowerCase()))
  if (jdWords.size === 0) return 0
  let common = 0
  jdWords.forEach(w => { if (resumeWords.has(w)) common++ })
  return Math.round((common / jdWords.size) * 100)
}

export default function Sidebar({ jdText, onJdChange }) {
  const [generatedResult, setGeneratedResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isStorageLoaded, setIsStorageLoaded] = useState(false)

  const matchScore = computeMatchScore(jdText, resumeText)

  // Effect to load API Key and Resume from Chrome's local storage on component mount
  useEffect(() => {
    if (window.chrome && chrome.storage) {
      chrome.storage.local.get(['apiKey', 'userResume'], (result) => {
        if (result.apiKey) setApiKey(result.apiKey);
        if (result.userResume) setResumeText(result.userResume);
        setIsStorageLoaded(true); // Signal that initial load is complete
      });
    } else {
      // Fallback for non-extension environment
      setIsStorageLoaded(true);
    }
  }, []); // Empty dependency array ensures this runs only once

  // Effect to save the API Key to storage when it changes
  useEffect(() => {
    if (isStorageLoaded && window.chrome && chrome.storage) {
      chrome.storage.local.set({ apiKey: apiKey });
    }
  }, [apiKey, isStorageLoaded]);

  // Effect to save the Resume text to storage with a debounce to prevent excessive writes
  useEffect(() => {
    if (isStorageLoaded && window.chrome && chrome.storage) {
      const handler = setTimeout(() => {
        chrome.storage.local.set({ userResume: resumeText });
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [resumeText, isStorageLoaded]);

  useEffect(() => {
    // This function runs when the component mounts to automatically scrape the Job Description.
    const scrapeJobDescription = () => {
      // Ensure we are running in a Chrome extension environment
      if (window.chrome && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab && activeTab.id) {
            // Send a message to our content script in the active tab
            chrome.tabs.sendMessage(
              activeTab.id,
              { action: "SCRAPE_JD" },
              (response) => {
                if (chrome.runtime.lastError) {
                  // This error means the content script isn't on the page, which is normal for non-job pages.
                  console.log("Content script not active on this page.");
                  return;
                }
                if (response && response.success) {
                  onJdChange(response.text);
                }
              }
            );
          }
        });
      }
    };
    scrapeJobDescription();
  }, [onJdChange]); // Dependency array to control when the effect runs.

  async function generateResume() {
    if (!apiKey) {
      alert('Please enter your Gemini API key in the Settings section first.');
      return;
    }

    setIsGenerating(true)
    setLoadingText('Analyzing Job Description...')
    
    try {
      setLoadingText('Mapping your achievements to the role...')
      
      // The API key is now securely retrieved from the component's state.
      const API_KEY = apiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`

      const prompt = `
        You are the "MakeResume" AI Engine. Your task is to tailor a user's resume to better match a specific Job Description.
        Task 1: Keyword Mapping & Resume Editing. Analyze the JD. Tailor the resume using ONLY the user's provided resume facts. Do not hallucinate.
        Task 2: Output strictly as a JSON object with keys: tailored_resume, keyword_match_score.

        Job Description:
        ${jdText || 'None provided'}

        User Resume:
        ${resumeText || 'None provided'}
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" } // Forces pure JSON response
        })
      })

      if (!response.ok) throw new Error('API request failed')
      
      const data = await response.json()
      const generatedJson = JSON.parse(data.candidates[0].content.parts[0].text)
      
      setGeneratedResult(generatedJson)
    } catch (error) {
      console.error('Error generating package:', error)
      alert('Failed to generate package. Did you set your Gemini API key?')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <aside className="sidebar" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
      <div className="sidebar-top">
        <h3 style={{ color: '#003366' }}>Match Score</h3>
        <div className="gauge">
          <div className="gauge-fill" style={{ width: `${matchScore}%`, backgroundColor: '#003366' }} />
        </div>
        <div className="gauge-label" style={{ color: '#003366' }}>{matchScore}%</div>
      </div>

      <div className="sidebar-middle">
        <h4 style={{ color: '#003366' }}>Settings</h4>
        <input
          type="password"
          placeholder="Enter your Gemini API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: '95%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '15px' }}
        />

        <h4 style={{ color: '#003366', marginBottom: '10px' }}>Your Resume</h4>
        <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your current resume..." />
      </div>

      <div className="sidebar-bottom">
        <button 
          className="primary" 
          onClick={generateResume} 
          disabled={isGenerating}
          style={{ backgroundColor: '#003366', color: '#fff' }}
        >
          {isGenerating ? loadingText : 'Tailor Resume'}
        </button>
        <div className="tab-content">
          {isGenerating ? (
            <div className="loading" style={{ fontStyle: 'italic', color: '#6c757d', padding: '20px', textAlign: 'center' }}>
              {loadingText}
            </div>
          ) : generatedResult ? (
            <>
              <pre className="result">{generatedResult.tailored_resume}</pre>
              <div className="meta">Keyword match score: {generatedResult.keyword_match_score}%</div>
            </>
          ) : (
            <div className="empty">No resume generated yet. Click "Tailor Resume".</div>
          )}
        </div>
      </div>
    </aside>
  )
}
