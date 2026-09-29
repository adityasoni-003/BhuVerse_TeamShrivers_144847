import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getWatersheds, getWatershedLayers } from '../services/api';
import Layout from '../components/Layout';
import { Map, Layers, Droplets, Sprout, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

const watershedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function WatershedExplorer() {
  const [watersheds, setWatersheds] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const [layers, setLayers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatersheds()
      .then(data => {
        setWatersheds(data);
        if (data.length > 0) {
          setSelectedWs(data[0]);
          getWatershedLayers(data[0].id).then(setLayers);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSelectWatershed = (ws) => {
    setSelectedWs(ws);
    getWatershedLayers(ws.id).then(setLayers);
  };

  const center = selectedWs ? [selectedWs.center_lat, selectedWs.center_lon] : [14.6812, 77.6015];

  return (
    <Layout currentWatershed={selectedWs ? selectedWs.name : "Watershed Explorer"}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Watershed Explorer</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Interactive multi-catchment GIS explorer with 30m boundary polygons, drainage topology, and land cover.
        </p>
      </div>

      {/* 3-Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 6fr 3fr', gap: '1.25rem', minHeight: '600px' }}>
        {/* Left Pane: Watersheds List */}
        <div className="gis-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="gis-card-header" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem' }}><Map size={16} /> Catchments</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{watersheds.length} Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
            {watersheds.map(ws => (
              <div
                key={ws.id}
                onClick={() => handleSelectWatershed(ws)}
                style={{
                  padding: '0.85rem',
                  borderRadius: '6px',
                  backgroundColor: selectedWs?.id === ws.id ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedWs?.id === ws.id ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: selectedWs?.id === ws.id ? '#38bdf8' : '#f8fafc' }}>
                  {ws.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Code: {ws.code} &bull; {ws.district}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                  <span>Area: {ws.area_ha.toLocaleString()} ha</span>
                  <span>{ws.interventions_count} Interventions</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Pane: GIS Map */}
        <div className="gis-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="map-container-wrapper" style={{ flex: 1, minHeight: '520px' }}>
            <MapContainer key={selectedWs?.id || 'default'} center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Landsat-9 30m Grid'
              />

              {/* Catchment Boundary */}
              {layers && layers.features.filter(f => f.properties.layer === 'watershed_boundary').map((feat, idx) => (
                <Polygon
                  key={`we-bnd-${idx}`}
                  positions={feat.geometry.coordinates[0].map(c => [c[1], c[0]])}
                  pathOptions={{ color: '#0ea5e9', weight: 3, fillColor: '#0284c7', fillOpacity: 0.1 }}
                />
              ))}

              {/* Stream Drainage Lines */}
              {layers && layers.features.filter(f => f.properties.layer === 'drainage').map((feat, idx) => (
                <Polyline
                  key={`we-drn-${idx}`}
                  positions={feat.geometry.coordinates.map(c => [c[1], c[0]])}
                  pathOptions={{ color: '#38bdf8', weight: 2.5 }}
                />
              ))}

              {/* Center Marker */}
              {selectedWs && (
                <Marker position={[selectedWs.center_lat, selectedWs.center_lon]} icon={watershedIcon}>
                  <Popup>
                    <strong>{selectedWs.name}</strong><br />
                    Code: {selectedWs.code}<br />
                    Area: {selectedWs.area_ha.toLocaleString()} ha
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Right Pane: Selected Watershed Summary Details */}
        <div className="gis-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="gis-card-header" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem' }}><Layers size={16} /> Catchment Overview</h3>
          </div>

          {selectedWs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div className="meta-key-value">
                <span className="meta-key">Watershed Area:</span>
                <span className="meta-val">{selectedWs.area_ha.toLocaleString()} ha</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Field Observations:</span>
                <span className="meta-val">{selectedWs.field_observations_count}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Supported by GIS:</span>
                <span className="meta-val" style={{ color: '#10b981' }}>{selectedWs.verified_supported_count}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Potential Anomalies:</span>
                <span className="meta-val" style={{ color: '#f59e0b' }}>{selectedWs.potential_anomalies_count}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Water Bodies:</span>
                <span className="meta-val">{selectedWs.water_bodies_count}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Interventions:</span>
                <span className="meta-val">{selectedWs.interventions_count}</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Vegetation Cover:</span>
                <span className="meta-val">{selectedWs.vegetation_coverage_pct}%</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Agriculture Cover:</span>
                <span className="meta-val">{selectedWs.agriculture_coverage_pct}%</span>
              </div>
              <div className="meta-key-value">
                <span className="meta-key">Latest Scene:</span>
                <span className="meta-val" style={{ fontSize: '0.7rem' }}>{selectedWs.latest_satellite_scene}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>Select a watershed from the left list.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
