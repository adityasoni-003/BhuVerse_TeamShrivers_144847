import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, currentWatershed, isLive = true, analysisId = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content-area">
        <Header 
          currentWatershed={currentWatershed} 
          isLive={isLive} 
          analysisId={analysisId}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}

