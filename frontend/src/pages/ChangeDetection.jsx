import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getChangeDetection, getWatersheds } from '../services/api';
import Layout from '../components/Layout';
import { History, Calendar, Sprout, Droplets, Activity, Layers, ArrowRight, ShieldCheck } from 'lucide-react';

const changeMarker = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function ChangeDetection() {
  const [watersheds, setWatersheds] = useState([]);
  const [selectedWs, setSelectedWs] = useState('WS-UP-01');
  const [baselineDate, setBaselineDate] = useState('2026-03-12');
  const [currentDate, setCurrentDate] = useState('2026-08-15');
  const [changeData, setChangeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sliderPos, setSliderPos] = useState(50);

  useEffect(() => {
    getWatersheds().then(setWatersheds).catch(() => []);
    getChangeDetection(selectedWs)
      .then(res => {
        setChangeData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedWs]);

  const handleCompare = () => {
    setLoading(true);
    getChangeDetection(selectedWs)
      .then(res => {
        setChangeData(res);
        setLoading(false);
      });
  };

  const center = [14.6812, 77.6015];

  return (
    <Layout currentWatershed="Upper Pennar Catchment">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Temporal Change Detection</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Multi-temporal satellite index comparison across pre-monsoon baseline and post-monsoon scenes.
        </p>
      </div>

      {/* Filter / Selector Bar */}
      <div className="gis-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Select Watershed</label>
            <select 
              value={selectedWs} 
              onChange={e => setSelectedWs(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', backgroundColor: 'var(--bg-space)', border: '1px solid var(--border-medium)', borderRadius: '6px', color: '#f8fafc' }}
            >
              <option value="WS-UP-01">Upper Pennar Catchment (SW-07)</option>
              <option value="WS-KG-02">Kalyandurg Sub-Catchment</option>
              <option value="WS-DH-03">Dharmavaram Watershed Sub-basin</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Baseline Date (Pre-Monsoon)</label>
            <input 
              type="date" 
              value={baselineDate} 
              onChange={e => setBaselineDate(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-space)', border: '1px solid var(--border-medium)', borderRadius: '6px', color: '#f8fafc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Current Date (Post-Monsoon)</label>
            <input 
              type="date" 
              value={currentDate} 
              onChange={e => setCurrentDate(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-space)', border: '1px solid var(--border-medium)', borderRadius: '6px', color: '#f8fafc' }}
            />
          </div>

          <button onClick={handleCompare} className="btn btn-primary" style={{ height: '42px' }}>
            <span>Compare Scenes</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {changeData && (
        <>
          {/* Change KPI row */}
          <div className="temporal-change-grid">
            <div className="change-metric-card">
              <span className="kpi-title">Vegetation Growth (Δ NDVI)</span>
              <div className="change-metric-val" style={{ color: '#10b981' }}>{changeData.delta.delta_ndvi}</div>
              <span className="kpi-meta">{changeData.delta.vegetation_change_pct} vigor growth</span>
            </div>

            <div className="change-metric-card">
              <span className="kpi-title">Water Retention Shift (Δ NDWI)</span>
              <div className="change-metric-val" style={{ color: '#38bdf8' }}>{changeData.delta.delta_ndwi}</div>
              <span className="kpi-meta">{changeData.delta.water_area_change_sqm} reservoir expansion</span>
            </div>

            <div className="change-metric-card">
              <span className="kpi-title">Bare Soil Reduction (Δ BSI)</span>
              <div className="change-metric-val" style={{ color: '#f59e0b' }}>{changeData.delta.delta_bsi}</div>
              <span className="kpi-meta">Erosion & degradation mitigation</span>
            </div>
          </div>

          {/* Interactive Split-Screen Map */}
          <div className="gis-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <div className="gis-card-header" style={{ marginBottom: '0.75rem' }}>
              <h2><History size={18} style={{ color: '#38bdf8' }} /> Split-Screen Multi-Temporal Satellite Viewer</h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Drag slider horizontally to compare scenes</span>
            </div>

            <div className="split-slider-container" style={{ height: '440px' }}>
              <div className="split-map-left" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <MapContainer center={center} zoom={15} zoomControl={false} dragging={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  <Marker position={center} icon={changeMarker} />
                </MapContainer>
              </div>

              <div className="split-map-right" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                <MapContainer center={center} zoom={15} zoomControl={false} dragging={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  <Marker position={center} icon={changeMarker} />
                  <Circle center={center} radius={60} pathOptions={{ color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.25 }} />
                </MapContainer>
              </div>

              <div className="split-slider-divider" style={{ left: `${sliderPos}%` }}>
                <div className="split-handle">⮂</div>
              </div>

              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sliderPos} 
                onChange={e => setSliderPos(Number(e.target.value))}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 860 }}
              />

              <div className="scene-date-badge scene-date-left">
                Baseline: {changeData.baseline_scene.date} (Landsat-8)
              </div>
              <div className="scene-date-badge scene-date-right">
                Current: {changeData.current_scene.date} (Landsat-9)
              </div>
            </div>
          </div>

          {/* Scientific Interpretation & Provenance */}
          <div className="gis-card">
            <div className="gis-card-header">
              <h2><ShieldCheck size={18} style={{ color: '#38bdf8' }} /> Scientific Interpretation & Evidence Provenance</h2>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {changeData.delta.trend_interpretation}
            </p>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div className="meta-key-value">
                <span className="meta-key">Baseline Scene ID:</span>
                <span className="meta-val">{changeData.baseline_scene.scene_id}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Current Scene ID:</span>
                <span className="meta-val">{changeData.current_scene.scene_id}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
