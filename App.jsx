import React, { useState } from 'react'
import Sidebar from './Sidebar.jsx'

export default function App() {
  const [jdText, setJdText] = useState('')

  return (
    <div className="app">
      <Sidebar jdText={jdText} onJdChange={setJdText} />
      <main className="content">
        <h1>MakeResume — Sidebar Demo</h1>
        <p>Open a job posting to automatically load the Job Description, and use the sidebar to tailor your resume.</p>
        <section className="preview">
          <h2>Job Description (preview)</h2>
          <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste a job description here" />
        </section>
      </main>
    </div>
  )
}
