import React, { useEffect, useState } from 'react';
import { getSystemStatus } from '../services/api';
import Layout from '../components/Layout';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Server, Database, Cpu, Satellite } from 'lucide-react';

export default function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = () => {
    setRefreshing(true);
    getSystemStatus()
      .then(data => {
        setStatus(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout currentWatershed="Upper Pennar Catchment">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>System Health & Diagnostics</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Live health verification across BhuVerse API, PostGIS, Raster Engine, AI, and STAC Satellite Providers.
          </p>
        </div>
        <button onClick={fetchStatus} className="btn btn-secondary" disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'live-pulse' : ''} />
          <span>{refreshing ? 'Ping In Progress...' : 'Ping Services Now'}</span>
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Checking service health...</p>
      ) : status ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Overall Health Header Card */}
          <div className="gis-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
            <div>
              <span className="kpi-title">Platform Operating State</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="live-pulse"></span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{status.overall_status} (All Engines Operational)</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>
              <div>Last Ping: {status.timestamp}</div>
              <div>Auto-refresh every 15s</div>
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {status.services.map((svc, idx) => (
              <div key={idx} className="gis-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{svc.name}</strong>
                  <span className="badge badge-success">
                    <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                    {svc.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.4rem 0' }}>
                  {svc.details}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#64748b' }}>Response Latency:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{svc.latency_ms} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="assessment-banner badge-anomaly">
          <AlertTriangle size={20} />
          <div>Unable to connect to BhuVerse backend service diagnostics.</div>
        </div>
      )}
    </Layout>
  );
}
