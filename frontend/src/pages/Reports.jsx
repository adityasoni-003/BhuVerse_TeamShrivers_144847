import React, { useState, useEffect } from 'react';
import { getAnalyses, getSpatialEvidence } from '../services/api';
import Layout from '../components/Layout';
import { FileText, Printer, Download, CheckCircle2, MapPin, Calendar, Satellite, Layers } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function Reports() {
  const [analyses, setAnalyses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('Spatial Evidence Report');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyses().then(data => {
      setAnalyses(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      getSpatialEvidence(selectedId, 50).then(setReportData).catch(console.error);
    }
  }, [selectedId]);

  return (
    <Layout currentWatershed="Upper Pennar Catchment">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Watershed Decision Support Reports</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Generate and export official SIH evaluator-ready spatial evidence reports.
          </p>
        </div>
        <button onClick={() => window.print()} className="btn btn-primary">
          <Printer size={16} />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Report Controls */}
      <div className="gis-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Select Observation Record</label>
            <select 
              value={selectedId || ''} 
              onChange={e => setSelectedId(Number(e.target.value))}
              style={{ width: '100%', padding: '0.6rem', backgroundColor: 'var(--bg-space)', border: '1px solid var(--border-medium)', borderRadius: '6px', color: '#f8fafc' }}
            >
              {analyses.map(an => (
                <option key={an.id} value={an.id}>
                  BHU-{an.id.toString().padStart(8, '0')} - {an.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Report Type</label>
            <select 
              value={reportType} 
              onChange={e => setReportType(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', backgroundColor: 'var(--bg-space)', border: '1px solid var(--border-medium)', borderRadius: '6px', color: '#f8fafc' }}
            >
              <option value="Spatial Evidence Report">Field & 30m Spatial Evidence Report</option>
              <option value="Watershed Assessment">Watershed Conservation Assessment</option>
              <option value="Change Detection Report">Multi-Temporal Change Detection Report</option>
              <option value="Intervention Monitoring Report">Intervention Monitoring & Verification</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report Document Card */}
      {reportData ? (
        <div className="gis-card printable-report" style={{ backgroundColor: '#0f172a', border: '1px solid var(--border-medium)', padding: '2.5rem' }}>
          {/* Report Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-accent)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#38bdf8', fontWeight: 700 }}>
                Ministry of Jal Shakti / SIH PS-15 Official Output
              </div>
              <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', margin: '0.3rem 0' }}>BhuVerse Watershed Spatial Evidence Report</h2>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Subject: {reportData.title} &bull; Watershed: {reportData.watershed_context ? reportData.watershed_context.watershed_name : 'Pennar Catchment'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', fontSize: '1.1rem' }}>
                {reportData.analysis_id}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Generated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Report Content Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            {/* Ground Evidence */}
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} /> 1. Ground Field Observation
              </h3>
              {reportData.field_observation.image_url && (
                <img 
                  src={`${BACKEND_URL}${reportData.field_observation.image_url}`} 
                  alt="Field Observation" 
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.75rem' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Identified Feature:</strong> {reportData.field_observation.asset_type}</div>
                <div><strong>AI Model Confidence:</strong> {(reportData.field_observation.confidence * 100).toFixed(1)}%</div>
                <div><strong>Field Coordinates:</strong> {reportData.field_observation.latitude ? `${reportData.field_observation.latitude.toFixed(6)}°N, ${reportData.field_observation.longitude.toFixed(6)}°E` : 'N/A'}</div>
                <div><strong>Capture Timestamp:</strong> {reportData.field_observation.capture_date ? new Date(reportData.field_observation.capture_date).toLocaleString() : '15 Aug 2026'}</div>
              </div>
            </div>

            {/* Satellite Evidence */}
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Satellite size={16} /> 2. 30m Satellite Remote Sensing Evidence
              </h3>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Satellite Scene:</strong> {reportData.satellite_provenance.scene_id}</div>
                <div><strong>Sensor Platform:</strong> {reportData.satellite_provenance.satellite}</div>
                <div><strong>Analysis Resolution:</strong> {reportData.satellite_provenance.analysis_resolution}</div>
                <div><strong>NDVI (Vegetation Index):</strong> {reportData.buffer_evidence.ndvi.mean.toFixed(3)}</div>
                <div><strong>NDWI (Water Index):</strong> {reportData.buffer_evidence.ndwi.mean.toFixed(3)}</div>
                <div><strong>BSI (Bare Soil Index):</strong> {reportData.buffer_evidence.bsi.mean.toFixed(3)}</div>
                <div><strong>Spatial Registration:</strong> Row {reportData.spatial_registration.satellite_row} / Col {reportData.spatial_registration.satellite_col}</div>
              </div>
            </div>
          </div>

          {/* Assessment & Decision Support */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
              3. Cross-Modal Spatial Assessment & Decision Recommendation
            </h3>
            <div className={`assessment-banner ${reportData.evidence_fusion.badge_class}`} style={{ margin: '0.75rem 0' }}>
              <div>
                <div className="assessment-title">{reportData.evidence_fusion.status}</div>
                <p className="assessment-desc">{reportData.evidence_fusion.summary}</p>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.75rem' }}>
              <strong>Applied Rule Code:</strong> <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{reportData.evidence_fusion.rule_applied}</code>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#94a3b8' }}>Loading report payload...</p>
      )}
    </Layout>
  );
}
