import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './Sidebar';

const container = document.getElementById('root');
const root = createRoot(container);

// Render the Sidebar and pass empty initial props
root.render(
  <Sidebar jdText="" onJdChange={() => {}} />
);