import React from 'react';
import { MapPin, User, Menu, Layers } from 'lucide-react';

export default function Header({ 
  currentWatershed = "Upper Pennar Catchment (SW-07)", 
  isLive = true, 
  analysisId = null,
  onToggleSidebar
}) {
  return (
    <header className="global-header">
      <div className="header-left">
        {onToggleSidebar && (
          <button 
            className="mobile-menu-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Open Navigation Drawer"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="header-logo-brand-mobile">
          <Layers size={18} style={{ color: '#38bdf8' }} />
          <span>BhuVerse</span>
        </div>

        <div className="header-title-block">
          <h1>Watershed Intelligence Platform</h1>
          <span>Geospatial Evidence & Decision Support System</span>
        </div>

        <div className="header-watershed-pill">
          <MapPin size={14} style={{ color: '#38bdf8' }} />
          <span>Watershed: <strong>{currentWatershed}</strong></span>
        </div>
      </div>

      <div className="header-right">
        {analysisId && (
          <div className="header-watershed-pill" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            Analysis ID: <span style={{ color: '#38bdf8' }}>{analysisId}</span>
          </div>
        )}

        {isLive && (
          <div className="live-data-badge">
            <span className="live-pulse"></span>
            <span>Live Data</span>
          </div>
        )}

        <div className="user-profile-badge">
          <User size={14} />
          <span>GIS Officer</span>
        </div>
      </div>
    </header>
  );
}

