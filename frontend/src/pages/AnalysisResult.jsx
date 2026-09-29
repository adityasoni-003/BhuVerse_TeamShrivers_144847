import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getSpatialEvidence } from '../services/api';
import Layout from '../components/Layout';
import { 
  ArrowLeft, 
  MapPin, 
  Cpu, 
  Satellite, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Layers, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Droplets,
  Sprout,
  Activity,
  History,
  ShieldCheck,
  Compass
} from 'lucide-react';


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const fieldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [48, 48]
});

const interventionMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30]
});

export default function AnalysisResult() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Buffer selection: 25, 50, 100 meters
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [explainOpen, setExplainOpen] = useState(true);
  const [basemap, setBasemap] = useState('satellite');
  const [splitSliderPos, setSplitSliderPos] = useState(50);

  useEffect(() => {
    setLoading(true);
    getSpatialEvidence(id, selectedRadius)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load spatial evidence analysis.');
        setLoading(false);
      });
  }, [id, selectedRadius]);

  if (loading && !data) {
    return (
      <Layout>
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <Activity size={36} className="live-pulse" style={{ margin: '0 auto 1rem auto' }} />
          <h3>Loading 30m Satellite & Field Spatial Evidence...</h3>
          <p>Extracting multi-spectral indices, pixel registration, and watershed topology</p>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="assessment-banner badge-anomaly" style={{ margin: '2rem' }}>
          <AlertTriangle size={24} />
          <div>
            <strong>Error:</strong> {error || 'Analysis record not found.'}
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>&larr; Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const {
    analysis_id,
    title,
    field_observation,
    spatial_registration,
    satellite_provenance,
    buffer_evidence,
    evidence_fusion,
    temporal_change,
    watershed_context,
    nearby_interventions,
    geojson_layers
  } = data;

  const hasGps = field_observation && field_observation.has_gps;
  const position = hasGps ? [field_observation.latitude, field_observation.longitude] : [14.6812, 77.6015];
  const isDemo = field_observation.inference_mode === 'demo';

  const lulcColors = {
    'Agriculture / Cropland': '#eab308',
    'Dense Vegetation': '#15803d',
    'Riparian Vegetation': '#22c55e',
    'Water Body / Retention': '#0284c7',
    'Scrub Land': '#ca8a04',
    'Barren / Degraded': '#78716c'
  };

  // Spectral gauge position calculations (0 to 100%)
  // NDVI range [-0.2, +0.8]
  const ndviPct = Math.min(100, Math.max(0, ((buffer_evidence.ndvi.mean - (-0.2)) / 1.0) * 100));
  // NDWI range [-0.6, +0.6]
  const ndwiPct = Math.min(100, Math.max(0, ((buffer_evidence.ndwi.mean - (-0.6)) / 1.2) * 100));
  // BSI range [-0.4, +0.6]
  const bsiPct = Math.min(100, Math.max(0, ((buffer_evidence.bsi.mean - (-0.4)) / 1.0) * 100));

  return (
    <Layout currentWatershed={watershed_context ? watershed_context.watershed_name : "Upper Pennar Catchment"} analysisId={analysis_id}>
      {/* User Journey Step Indicator Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-card)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <span style={{ color: '#10b981', fontWeight: 600 }}>1. Field Image</span> &rarr;
        <span style={{ color: '#10b981', fontWeight: 600 }}>2. GPS Extracted</span> &rarr;
        <span style={{ color: '#10b981', fontWeight: 600 }}>3. AI Feature</span> &rarr;
        <span style={{ color: '#10b981', fontWeight: 600 }}>4. 30m Registration</span> &rarr;
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>5. Satellite Evidence</span> &rarr;
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>6. Evidence Fusion</span> &rarr;
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>7. Temporal Change</span> &rarr;
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>8. Decision Support</span>
      </div>

      {/* Top Header Summary Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span><strong>FIELD OBSERVATION:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{field_observation.asset_type}</span></span>
            <span><strong>AI Confidence:</strong> {(field_observation.confidence * 100).toFixed(1)}%</span>
            <span><strong>Location:</strong> {hasGps ? `${field_observation.latitude.toFixed(4)}° N, ${field_observation.longitude.toFixed(4)}° E` : 'Unregistered'}</span>
            <span><strong>Image Date:</strong> {field_observation.capture_date ? new Date(field_observation.capture_date).toLocaleDateString() : '15 Aug 2026'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge ${isDemo ? 'badge-demo' : 'badge-real'}`}>
            <Cpu size={14} style={{ marginRight: '4px' }} />
            {isDemo ? 'DEMO INFERENCE' : 'REAL MODEL'}
          </span>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
            <FileText size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Signature Layout: Left (Primary GIS Map & Buffer) | Right (Spatial Reg & Provenance) */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Primary Evidence Map */}
        <div className="gis-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} style={{ color: '#38bdf8' }} />
              <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>Primary Spatial Evidence GIS Map</strong>
            </div>

            {/* Buffer Selector [ 25 m ] [ 50 m ] [ 100 m ] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Buffer Radius:</span>
              <div className="buffer-selector-bar">
                <button 
                  className={`buffer-btn ${selectedRadius === 25 ? 'active' : ''}`}
                  onClick={() => setSelectedRadius(25)}
                >
                  25 m
                </button>
                <button 
                  className={`buffer-btn ${selectedRadius === 50 ? 'active' : ''}`}
                  onClick={() => setSelectedRadius(50)}
                >
                  50 m
                </button>
                <button 
                  className={`buffer-btn ${selectedRadius === 100 ? 'active' : ''}`}
                  onClick={() => setSelectedRadius(100)}
                >
                  100 m
                </button>
              </div>
            </div>
          </div>

          <div className="map-container-wrapper" style={{ height: '380px' }}>
            <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
              {basemap === 'satellite' ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri &mdash; Landsat-9 / Sentinel-2 Grid'
                />
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
              )}

              {/* Physical Buffer Circle in exact meters */}
              {hasGps && (
                <Circle
                  center={position}
                  radius={selectedRadius}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 2,
                    dashArray: '4, 6',
                    fillColor: '#0ea5e9',
                    fillOpacity: 0.18
                  }}
                />
              )}

              {/* Catchment boundary & drainage lines from backend */}
              {geojson_layers && geojson_layers.features.filter(f => f.properties.layer === 'watershed_boundary').map((feat, idx) => (
                <Polygon
                  key={`res-bnd-${idx}`}
                  positions={feat.geometry.coordinates[0].map(c => [c[1], c[0]])}
                  pathOptions={{ color: feat.properties.stroke, weight: feat.properties.strokeWidth, fillColor: feat.properties.fill, fillOpacity: feat.properties.fillOpacity }}
                />
              ))}

              {geojson_layers && geojson_layers.features.filter(f => f.properties.layer === 'drainage').map((feat, idx) => (
                <Polyline
                  key={`res-drn-${idx}`}
                  positions={feat.geometry.coordinates.map(c => [c[1], c[0]])}
                  pathOptions={{ color: feat.properties.stroke, weight: feat.properties.strokeWidth }}
                />
              ))}

              {/* Nearby Interventions */}
              {nearby_interventions.map((item) => (
                <Marker
                  key={`res-int-${item.id}`}
                  position={[item.latitude, item.longitude]}
                  icon={interventionMarkerIcon}
                >
                  <Popup>
                    <strong>{item.type}</strong><br />
                    Distance: {item.distance_m}m<br />
                    Status: {item.status}
                  </Popup>
                </Marker>
              ))}

              {/* Field Observation Point */}
              {hasGps && (
                <Marker position={position} icon={fieldIcon}>
                  <Popup>
                    <div style={{ padding: '0.2rem' }}>
                      <strong style={{ color: '#0ea5e9' }}>Field Observation</strong><br />
                      Class: <strong>{field_observation.asset_type}</strong><br />
                      Confidence: {(field_observation.confidence * 100).toFixed(1)}%<br />
                      GPS: {field_observation.latitude.toFixed(6)}°N, {field_observation.longitude.toFixed(6)}°E<br />
                      Buffer: {selectedRadius}m ({buffer_evidence.buffer_area_ha} ha)<br />
                      Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{evidence_fusion.status}</span>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Map Legend */}
            <div className="map-legend-widget" style={{ bottom: '0.75rem', left: '0.75rem', padding: '0.5rem 0.75rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                <div>● <strong style={{ color: '#38bdf8' }}>Cyan:</strong> Field Point + {selectedRadius}m Buffer Circle</div>
                <div>● <strong style={{ color: '#10b981' }}>Green:</strong> Catchment Interventions</div>
                <div>― <strong style={{ color: '#7dd3fc' }}>Blue:</strong> Stream Drainage Order</div>
              </div>
            </div>
          </div>
        </div>

        {/* Spatial Registration & Satellite Provenance Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Spatial Registration Card */}
          <div className="gis-card" style={{ padding: '1.25rem' }}>
            <div className="gis-card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <h3><MapPin size={16} style={{ color: '#38bdf8' }} /> Spatial Registration</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>30m Grid Pixel Cell</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
              <div className="meta-key-value">
                <span className="meta-key">Latitude:</span>
                <span className="meta-val">{hasGps ? `${field_observation.latitude.toFixed(6)}° N` : 'N/A'}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Longitude:</span>
                <span className="meta-val">{hasGps ? `${field_observation.longitude.toFixed(6)}° E` : 'N/A'}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Satellite Pixel:</span>
                <span className="meta-val">Row {spatial_registration.satellite_row} / Col {spatial_registration.satellite_col}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Pixel Center:</span>
                <span className="meta-val">{spatial_registration.pixel_center_lat}° N, {spatial_registration.pixel_center_lon}° E</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Distance from Center:</span>
                <span className="meta-val">{spatial_registration.distance_from_pixel_center_m} m</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Watershed:</span>
                <span className="meta-val">{watershed_context ? watershed_context.watershed_name : 'Pennar Catchment'}</span>
              </div>
            </div>
          </div>

          {/* SRISHTI-DRISHTI Satellite Evidence Card */}
          <div className="gis-card" style={{ padding: '1.25rem' }}>
            <div className="gis-card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <h3><Satellite size={16} style={{ color: '#38bdf8' }} /> Satellite Evidence (SRISHTI-DRISHTI)</h3>
              <span className="live-data-badge">
                {satellite_provenance.analysis_resolution_validated ? 'Validated' : 'Unvalidated'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
              <div className="meta-key-value">
                <span className="meta-key">Source:</span>
                <span className="meta-val" style={{ fontSize: '0.75rem' }}>{satellite_provenance.source}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Product / Scene ID:</span>
                <span className="meta-val" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{satellite_provenance.scene_id}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Satellite Sensor:</span>
                <span className="meta-val">{satellite_provenance.satellite}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Acquisition Date:</span>
                <span className="meta-val">{satellite_provenance.acquisition_date}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Native Resolution:</span>
                <span className="meta-val">{satellite_provenance.native_resolution}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Analysis Resolution:</span>
                <span className="meta-val" style={{ color: satellite_provenance.analysis_resolution_validated ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {satellite_provenance.analysis_resolution}
                </span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">CRS:</span>
                <span className="meta-val">{satellite_provenance.crs}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Temporal Gap:</span>
                <span className="meta-val">{satellite_provenance.temporal_gap_days} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local Satellite Evidence: Spectral Gauges + LULC Composition */}
      <section className="gis-card" style={{ marginBottom: '1.5rem' }}>
        <div className="gis-card-header">
          <h2><Sprout size={18} style={{ color: '#38bdf8' }} /> Local Satellite Evidence & Multi-spectral Indicators ({selectedRadius}m Buffer)</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Physical Radius Buffer Area: {buffer_evidence.buffer_area_ha} hectares</span>
        </div>

        {/* 3 Spectral Cards with Visual Indicators */}
        <div className="spectral-cards-grid">
          {/* NDVI */}
          <div className="spectral-card">
            <div className="spectral-card-header">
              <span className="spectral-name">NDVI (Vegetation Index)</span>
              <Sprout size={16} style={{ color: '#10b981' }} />
            </div>
            <div className="spectral-mean" style={{ color: '#10b981' }}>
              {buffer_evidence.ndvi.mean >= 0 ? `+${buffer_evidence.ndvi.mean.toFixed(3)}` : buffer_evidence.ndvi.mean.toFixed(3)}
            </div>

            {/* Compact Remote-sensing Indicator Gauge Bar */}
            <div style={{ margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                <span>LOW (0.0)</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Remote-sensing indicator</span>
                <span>HIGH (0.8)</span>
              </div>
              <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ position: 'absolute', left: `${ndviPct}%`, top: '-3px', width: '12px', height: '12px', background: '#10b981', border: '2px solid #ffffff', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0' }}>
              {buffer_evidence.ndvi.status}
            </div>
            <div className="spectral-stats-row">
              <span>Min: {buffer_evidence.ndvi.min.toFixed(3)}</span>
              <span>Max: {buffer_evidence.ndvi.max.toFixed(3)}</span>
              <span>Std Dev: {buffer_evidence.ndvi.std_dev.toFixed(3)}</span>
            </div>
          </div>

          {/* NDWI */}
          <div className="spectral-card">
            <div className="spectral-card-header">
              <span className="spectral-name">NDWI (Water Index)</span>
              <Droplets size={16} style={{ color: '#38bdf8' }} />
            </div>
            <div className="spectral-mean" style={{ color: '#38bdf8' }}>
              {buffer_evidence.ndwi.mean >= 0 ? `+${buffer_evidence.ndwi.mean.toFixed(3)}` : buffer_evidence.ndwi.mean.toFixed(3)}
            </div>

            {/* Compact Remote-sensing Indicator Gauge Bar */}
            <div style={{ margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                <span>LOW WATER SIGNAL</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Remote-sensing indicator</span>
                <span>HIGH WATER SIGNAL</span>
              </div>
              <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ position: 'absolute', left: `${ndwiPct}%`, top: '-3px', width: '12px', height: '12px', background: '#38bdf8', border: '2px solid #ffffff', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0' }}>
              {buffer_evidence.ndwi.status}
            </div>
            <div className="spectral-stats-row">
              <span>Min: {buffer_evidence.ndwi.min.toFixed(3)}</span>
              <span>Max: {buffer_evidence.ndwi.max.toFixed(3)}</span>
              <span>Std Dev: {buffer_evidence.ndwi.std_dev.toFixed(3)}</span>
            </div>
          </div>

          {/* BSI */}
          <div className="spectral-card">
            <div className="spectral-card-header">
              <span className="spectral-name">BSI (Bare Soil Index)</span>
              <Activity size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div className="spectral-mean" style={{ color: '#f59e0b' }}>
              {buffer_evidence.bsi.mean >= 0 ? `+${buffer_evidence.bsi.mean.toFixed(3)}` : buffer_evidence.bsi.mean.toFixed(3)}
            </div>

            {/* Compact Remote-sensing Indicator Gauge Bar */}
            <div style={{ margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                <span>LOW EXPOSURE</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Remote-sensing indicator</span>
                <span>HIGH BARE SOIL</span>
              </div>
              <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ position: 'absolute', left: `${bsiPct}%`, top: '-3px', width: '12px', height: '12px', background: '#f59e0b', border: '2px solid #ffffff', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0' }}>
              {buffer_evidence.bsi.status}
            </div>
            <div className="spectral-stats-row">
              <span>Min: {buffer_evidence.bsi.min.toFixed(3)}</span>
              <span>Max: {buffer_evidence.bsi.max.toFixed(3)}</span>
              <span>Std Dev: {buffer_evidence.bsi.std_dev.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* LULC Composition */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
            <span>Land Use / Land Cover — {selectedRadius}m Buffer</span>
            <span style={{ color: '#94a3b8' }}>Class Composition Breakdown</span>
          </div>

          {/* Stacked Horizontal Composition Bar */}
          <div className="lulc-bar-stacked">
            {Object.entries(buffer_evidence.lulc).map(([label, pct]) => (
              <div 
                key={label} 
                className="lulc-segment"
                style={{ 
                  width: `${pct}%`, 
                  backgroundColor: lulcColors[label] || '#94a3b8' 
                }}
                title={`${label}: ${pct}%`}
              />
            ))}
          </div>

          {/* LULC Percentage Table Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {Object.entries(buffer_evidence.lulc).map(([label, pct]) => (
              <div key={label} className="lulc-row" style={{ backgroundColor: 'var(--bg-surface)', padding: '0.45rem 0.65rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <div className="lulc-label">
                  <span className="lulc-dot" style={{ backgroundColor: lulcColors[label] || '#94a3b8' }}></span>
                  <span style={{ fontSize: '0.75rem' }}>{label}</span>
                </div>
                <span className="lulc-pct">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVIDENCE FUSION: Ground vs Satellite Evidence Panel */}
      <section className="evidence-fusion-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} style={{ color: '#38bdf8' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>Evidence Fusion (Ground ⟷ Satellite)</h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cross-Modal Agreement Protocol</span>
        </div>

        <div className="fusion-columns">
          {/* Column 1: Ground Observation */}
          <div className="fusion-col">
            <div className="fusion-col-title">
              <MapPin size={16} /> GROUND OBSERVATION
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {field_observation.image_url ? (
                <img 
                  src={`${BACKEND_URL}${field_observation.image_url}`} 
                  alt={field_observation.filename}
                  style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/120x90/1e293b/94a3b8?text=Field+Photo';
                  }}
                />
              ) : (
                <div style={{ width: '120px', height: '90px', background: '#0f172a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.7rem' }}>
                  No Photo
                </div>
              )}
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{field_observation.asset_type}</div>
                <div style={{ color: '#10b981', fontWeight: 600 }}>{(field_observation.confidence * 100).toFixed(1)}% AI confidence</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Field photograph EXIF date: {field_observation.capture_date ? new Date(field_observation.capture_date).toLocaleDateString() : '15 Aug 2026'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  GPS: {hasGps ? `${field_observation.latitude.toFixed(4)}° N, ${field_observation.longitude.toFixed(4)}° E` : 'Missing'}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Satellite Evidence */}
          <div className="fusion-col">
            <div className="fusion-col-title">
              <Satellite size={16} /> SATELLITE EVIDENCE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div><span style={{ color: '#94a3b8' }}>NDWI:</span> <strong style={{ color: '#38bdf8' }}>{buffer_evidence.ndwi.mean >= 0 ? `+${buffer_evidence.ndwi.mean.toFixed(3)}` : buffer_evidence.ndwi.mean.toFixed(3)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>NDVI:</span> <strong style={{ color: '#10b981' }}>{buffer_evidence.ndvi.mean >= 0 ? `+${buffer_evidence.ndvi.mean.toFixed(3)}` : buffer_evidence.ndvi.mean.toFixed(3)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>BSI:</span> <strong style={{ color: '#f59e0b' }}>{buffer_evidence.bsi.mean >= 0 ? `+${buffer_evidence.bsi.mean.toFixed(3)}` : buffer_evidence.bsi.mean.toFixed(3)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>LULC:</span> <strong>{Object.keys(buffer_evidence.lulc)[0]}</strong></div>
              <div style={{ gridColumn: 'span 2', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Scene: {satellite_provenance.scene_id} ({satellite_provenance.acquisition_date})
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Banner (Supported / Anomaly / Insufficient) */}
        <div className={`assessment-banner ${evidence_fusion.badge_class}`}>
          {evidence_fusion.status === 'SUPPORTED BY SPATIAL EVIDENCE' && <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0 }} />}
          {evidence_fusion.status === 'POTENTIAL ANOMALY' && <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />}
          {evidence_fusion.status === 'INSUFFICIENT EVIDENCE' && <HelpCircle size={24} style={{ color: '#94a3b8', flexShrink: 0 }} />}
          
          <div style={{ flex: 1 }}>
            <div className="assessment-title">{evidence_fusion.status}</div>
            <p className="assessment-desc">{evidence_fusion.summary}</p>
          </div>
        </div>

        {/* Explainability Accordion: "Why this assessment?" */}
        <div className="explainability-box">
          <div className="explainability-header" onClick={() => setExplainOpen(!explainOpen)}>
            <span>Why this assessment? (Auditable Spatial Decision Rule)</span>
            {explainOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {explainOpen && evidence_fusion.explainability && (
            <div className="explainability-body">
              <div><span style={{ color: '#94a3b8' }}>Field class:</span> <strong>{evidence_fusion.explainability.field_class}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>AI confidence:</span> <strong>{evidence_fusion.explainability.ai_confidence}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Satellite scene:</span> <strong>{satellite_provenance.scene_id}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>NDVI:</span> <strong>{evidence_fusion.explainability.ndvi_indicator}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>NDWI:</span> <strong>{evidence_fusion.explainability.ndwi_indicator}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>BSI:</span> <strong>{evidence_fusion.explainability.bsi_indicator}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>LULC:</span> <strong>{evidence_fusion.explainability.dominant_lulc}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Spatial relationship:</span> <strong>{evidence_fusion.explainability.spatial_relationship}</strong></div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#94a3b8' }}>Assessment rule:</span><br />
                <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'block', marginTop: '0.2rem' }}>
                  {evidence_fusion.rule_applied}
                </code>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Temporal Change Section (Split-Screen Map + Deltas) */}
      {temporal_change && (
        <section className="gis-card" style={{ marginBottom: '1.5rem' }}>
          <div className="gis-card-header">
            <h2><History size={18} style={{ color: '#38bdf8' }} /> Temporal Change Analysis</h2>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Baseline: <strong style={{ color: '#cbd5e1' }}>{temporal_change.baseline_scene.date}</strong> &bull; Current: <strong style={{ color: '#38bdf8' }}>{temporal_change.current_scene.date}</strong>
            </div>
          </div>

          <div className="temporal-change-grid">
            <div className="change-metric-card">
              <span className="kpi-title">Vegetation (Δ NDVI)</span>
              <div className="change-metric-val" style={{ color: '#10b981' }}>{temporal_change.delta.delta_ndvi}</div>
              <span className="kpi-meta">{temporal_change.delta.vegetation_change_pct} canopy vigor shift</span>
            </div>

            <div className="change-metric-card">
              <span className="kpi-title">Water area / NDWI (Δ NDWI)</span>
              <div className="change-metric-val" style={{ color: '#38bdf8' }}>{temporal_change.delta.delta_ndwi}</div>
              <span className="kpi-meta">{temporal_change.delta.water_area_change_sqm} surface spread</span>
            </div>

            <div className="change-metric-card">
              <span className="kpi-title">Surface condition (Δ BSI)</span>
              <div className="change-metric-val" style={{ color: '#f59e0b' }}>{temporal_change.delta.delta_bsi}</div>
              <span className="kpi-meta">Soil degradation reduction</span>
            </div>
          </div>

          {/* Diverging Legend for Change Map */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.5rem 0 1rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Decrease (Degradation)</span>
            <div style={{ width: '180px', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #ef4444, #cbd5e1, #10b981)' }} />
            <span>Increase (Enhancement)</span>
          </div>

          {/* Interactive Split Before/After Visualizer */}
          <div className="split-slider-container">
            {/* Left Baseline Map Panel */}
            <div className="split-map-left" style={{ clipPath: `inset(0 ${100 - splitSliderPos}% 0 0)` }}>
              <MapContainer center={position} zoom={15} zoomControl={false} dragging={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <Marker position={position} icon={fieldIcon} />
              </MapContainer>
            </div>

            {/* Right Current Map Panel */}
            <div className="split-map-right" style={{ clipPath: `inset(0 0 0 ${splitSliderPos}%)` }}>
              <MapContainer center={position} zoom={15} zoomControl={false} dragging={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <Marker position={position} icon={fieldIcon} />
                <Circle center={position} radius={50} pathOptions={{ color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 }} />
              </MapContainer>
            </div>

            {/* Split Slider Line & Handle */}
            <div className="split-slider-divider" style={{ left: `${splitSliderPos}%` }}>
              <div className="split-handle">⮂</div>
            </div>

            {/* Range Slider for Interaction */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={splitSliderPos} 
              onChange={e => setSplitSliderPos(Number(e.target.value))}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'ew-resize',
                zIndex: 860
              }}
            />

            <div className="scene-date-badge scene-date-left">
              BASELINE: {temporal_change.baseline_scene.date}
            </div>
            <div className="scene-date-badge scene-date-right">
              CURRENT: {temporal_change.current_scene.date}
            </div>
          </div>
        </section>
      )}

      {/* Watershed Context & Nearby Interventions */}
      {watershed_context && (
        <section className="gis-card">
          <div className="gis-card-header">
            <h2><Compass size={18} style={{ color: '#38bdf8' }} /> Watershed Context</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{watershed_context.watershed_name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Topography & Soil */}
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.75rem' }}>Catchment Hydrology & Terrain</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div className="meta-key-value">
                  <span className="meta-key">Watershed:</span>
                  <span className="meta-val">{watershed_context.watershed_name}</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Sub-watershed:</span>
                  <span className="meta-val">{watershed_context.sub_watershed}</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Observation location:</span>
                  <span className="meta-val">{position[0].toFixed(4)}° N, {position[1].toFixed(4)}° E</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Elevation:</span>
                  <span className="meta-val">{watershed_context.elevation_m} m AMSL</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Slope:</span>
                  <span className="meta-val">{watershed_context.slope_deg}° (Gentle Catchment)</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Drainage context:</span>
                  <span className="meta-val">{watershed_context.drainage_stream_order}</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Soil type:</span>
                  <span className="meta-val">{watershed_context.soil_type}</span>
                </div>
                <div className="meta-key-value">
                  <span className="meta-key">Annual rainfall:</span>
                  <span className="meta-val">{watershed_context.annual_rainfall_normal_mm} mm</span>
                </div>
              </div>
            </div>

            {/* Nearby Interventions Spatial List */}
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.75rem' }}>Nearby Interventions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {nearby_interventions.map((item) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '0.6rem 0.8rem', 
                      backgroundColor: 'var(--bg-surface)', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>● {item.type}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{item.distance_m}m away &bull; {item.status}</div>
                    </div>
                    <span className={`badge ${item.status_code === 'SUPPORTED' ? 'badge-success' : 'badge-demo'}`}>
                      {item.status_code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

