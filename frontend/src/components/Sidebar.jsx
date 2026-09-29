import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  PlusCircle, 
  Map, 
  History, 
  ShieldCheck, 
  FileText, 
  Database, 
  Activity,
  Layers,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/observations', label: 'Field Observations', icon: Camera },
    { to: '/new', label: 'New Analysis', icon: PlusCircle, badge: 'Core' },
    { to: '/explorer', label: 'Watershed Explorer', icon: Map },
    { to: '/change-detection', label: 'Change Detection', icon: History },
    { to: '/interventions', label: 'Interventions', icon: ShieldCheck },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/provenance', label: 'Data & Provenance', icon: Database },
    { to: '/status', label: 'System Status', icon: Activity },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Layers size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="sidebar-title">BhuVerse</div>
            <div className="sidebar-subtitle">Watershed GIS Platform</div>
          </div>
          {onClose && (
            <button 
              className="mobile-close-btn"
              onClick={onClose}
              aria-label="Close Sidebar Navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                end={item.to === '/'}
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div><strong>SIH 2026 Problem 15</strong></div>
          <div>30m Satellite & Field Evidence</div>
        </div>
      </aside>
    </>
  );
}

