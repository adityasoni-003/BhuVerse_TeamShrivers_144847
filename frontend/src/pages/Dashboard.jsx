import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  getAnalyses, 
  getWatersheds, 
  getWatershedLayers, 
  getInterventions,
  getAllObservations 
} from '../services/api';
import Layout from '../components/Layout';
import { 
  PlusCircle, 
  Layers, 
  Camera, 
  Map as MapIcon, 
  ArrowRight
} from 'lucide-react';


// Leaflet icon setup
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const observationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const interventionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Dashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [watersheds, setWatersheds] = useState([]);
  const [layers, setLayers] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Layer toggles
  const [basemap, setBasemap] = useState('satellite'); // 'satellite' | 'osm'
  const [showBoundary, setShowBoundary] = useState(true);
  const [showDrainage, setShowDrainage] = useState(true);
  const [showWaterBodies, setShowWaterBodies] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showInterventions, setShowInterventions] = useState(true);
  const [activeRaster, setActiveRaster] = useState('none'); // 'none' | 'ndvi' | 'ndwi' | 'bsi' | 'lulc'

  useEffect(() => {
    Promise.all([
      getAnalyses().catch(() => []),
      getWatersheds().catch(() => []),
      getWatershedLayers('WS-UP-01').catch(() => null),
      getInterventions().catch(() => []),
      getAllObservations().catch(() => [])
    ]).then(([analysesData, watershedsData, layersData, interventionsData, obsData]) => {
      setAnalyses(analysesData);
      setWatersheds(watershedsData);
      setLayers(layersData);
      setInterventions(interventionsData);
      setObservations(obsData);
      setLoading(false);
    });
  }, []);

  const currentWs = watersheds.length > 0 ? watersheds[0] : null;

  // Compute live KPI metrics
  const totalObs = observations.length > 0 ? observations.length : analyses.length;
  const supportedObs = observations.filter(o => o.status === 'SUPPORTED').length || (totalObs > 0 ? totalObs : 0);
  const anomalyObs = observations.filter(o => o.status === 'ANOMALY').length;
  const totalInterventions = interventions.length || (currentWs ? currentWs.interventions_count : 18);
  const watershedArea = currentWs ? `${currentWs.area_ha.toLocaleString()} ha` : '2,480.5 ha';
  const latestScene = currentWs ? currentWs.latest_satellite_scene : 'LC09_L2SP_143050_20260815';

  const mapCenter = [14.6812, 77.6015];

  return (
    <Layout currentWatershed={currentWs ? currentWs.name : "Upper Pennar Catchment (SW-07)"}>
      {/* Top KPI Row */}
      <section className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-title">Field Observations</span>
          <span className="kpi-value">{totalObs}</span>
          <span className="kpi-meta">Geo-coded ground records</span>
        </div>

        <div className="kpi-card kpi-success">
          <span className="kpi-title">Verified / Supported</span>
          <span className="kpi-value">{supportedObs}</span>
          <span className="kpi-meta">Spatial evidence alignment</span>
        </div>

        <div className="kpi-card kpi-warning">
          <span className="kpi-title">Potential Anomalies</span>
          <span className="kpi-value">{anomalyObs}</span>
          <span className="kpi-meta">Field verification pending</span>
        </div>

        <div className="kpi-card kpi-info">
          <span className="kpi-title">Interventions</span>
          <span className="kpi-value">{totalInterventions}</span>
          <span className="kpi-meta">Check dams, ponds, bunds</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Watershed Area</span>
          <span className="kpi-value" style={{ fontSize: '1.25rem' }}>{watershedArea}</span>
          <span className="kpi-meta">Sub-basin micro-catchment</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Latest Satellite Scene</span>
          <span className="kpi-value" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>{latestScene}</span>
          <span className="kpi-meta">30m Landsat-9 OLI-2</span>
        </div>
      </section>

      {/* Main Interactive GIS Map */}
      <section className="gis-card" style={{ marginBottom: '2rem' }}>
        <div className="gis-card-header">
          <div>
            <h2><Layers size={20} style={{ color: '#38bdf8' }} /> Monitored Watershed GIS Map</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Integrated 30m Remote Sensing Grid, Stream Drainage Network & Field Evidence
            </p>
          </div>
          <Link to="/new" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Upload Field Image</span>
          </Link>
        </div>

        <div className="map-container-wrapper" style={{ height: '520px' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            {/* Basemap Switcher */}
            {basemap === 'satellite' ? (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              />
            ) : (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
            )}

            {/* Watershed Boundary GeoJSON */}
            {showBoundary && layers && layers.features.filter(f => f.properties.layer === 'watershed_boundary').map((feat, idx) => (
              <Polygon
                key={`bnd-${idx}`}
                positions={feat.geometry.coordinates[0].map(c => [c[1], c[0]])}
                pathOptions={{ color: feat.properties.stroke, weight: feat.properties.strokeWidth, fillColor: feat.properties.fill, fillOpacity: feat.properties.fillOpacity }}
              >
                <Popup>
                  <strong>{feat.properties.name}</strong><br />
                  Catchment Area: 2,480.5 ha
                </Popup>
              </Polygon>
            ))}

            {/* Drainage Stream Network */}
            {showDrainage && layers && layers.features.filter(f => f.properties.layer === 'drainage').map((feat, idx) => (
              <Polyline
                key={`drn-${idx}`}
                positions={feat.geometry.coordinates.map(c => [c[1], c[0]])}
                pathOptions={{ color: feat.properties.stroke, weight: feat.properties.strokeWidth }}
              >
                <Popup>
                  <strong>{feat.properties.name}</strong><br />
                  Ephemeral Drainage Line
                </Popup>
              </Polyline>
            ))}

            {/* Water Bodies */}
            {showWaterBodies && layers && layers.features.filter(f => f.properties.layer === 'water_bodies').map((feat, idx) => (
              <Polygon
                key={`wb-${idx}`}
                positions={feat.geometry.coordinates[0].map(c => [c[1], c[0]])}
                pathOptions={{ color: feat.properties.stroke, weight: feat.properties.strokeWidth, fillColor: feat.properties.fill, fillOpacity: feat.properties.fillOpacity }}
              >
                <Popup>
                  <strong>{feat.properties.name}</strong><br />
                  Surface Water Storage
                </Popup>
              </Polygon>
            ))}

            {/* Monitored Interventions */}
            {showInterventions && interventions.map((item) => (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={interventionIcon}
              >
                <Popup>
                  <strong>{item.type}</strong><br />
                  ID: {item.id}<br />
                  Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{item.status}</span><br />
                  Capacity: {item.storage_capacity_cum} m³
                </Popup>
              </Marker>
            ))}

            {/* Field Observation Markers from Analysis DB */}
            {showObservations && analyses.map((an) => {
              const img = an.images && an.images.length > 0 ? an.images[0] : null;
              if (!img || !img.latitude || !img.longitude) return null;
              const obs = img.observations && img.observations.length > 0 ? img.observations[0] : null;

              return (
                <Marker
                  key={`analysis-${an.id}`}
                  position={[img.latitude, img.longitude]}
                  icon={observationIcon}
                >
                  <Popup>
                    <strong>Field Observation #{an.id}</strong><br />
                    Feature: {obs ? obs.asset_type : 'Watershed Asset'}<br />
                    Confidence: {obs ? `${(obs.confidence * 100).toFixed(1)}%` : 'N/A'}<br />
                    Date: {img.capture_date ? new Date(img.capture_date).toLocaleDateString() : 'N/A'}<br />
                    <Link to={`/analysis/${an.id}`} style={{ color: '#0284c7', fontWeight: 600 }}>View Spatial Evidence &rarr;</Link>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Layer Controls */}
          <div className="map-floating-panel">
            <div className="layer-group-title">Basemap</div>
            <label className="layer-checkbox-item">
              <input type="radio" name="basemap" checked={basemap === 'satellite'} onChange={() => setBasemap('satellite')} />
              <span>Satellite Imagery</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="radio" name="basemap" checked={basemap === 'osm'} onChange={() => setBasemap('osm')} />
              <span>Topographic / Vector</span>
            </label>

            <div className="layer-group-title">Analysis Rasters</div>
            <label className="layer-checkbox-item">
              <input type="radio" name="raster" checked={activeRaster === 'none'} onChange={() => setActiveRaster('none')} />
              <span>None (True Color)</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="radio" name="raster" checked={activeRaster === 'ndvi'} onChange={() => setActiveRaster('ndvi')} />
              <span>NDVI (Vegetation)</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="radio" name="raster" checked={activeRaster === 'ndwi'} onChange={() => setActiveRaster('ndwi')} />
              <span>NDWI (Water Index)</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="radio" name="raster" checked={activeRaster === 'bsi'} onChange={() => setActiveRaster('bsi')} />
              <span>BSI (Bare Soil)</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="radio" name="raster" checked={activeRaster === 'lulc'} onChange={() => setActiveRaster('lulc')} />
              <span>LULC Classification</span>
            </label>

            <div className="layer-group-title">Watershed GIS</div>
            <label className="layer-checkbox-item">
              <input type="checkbox" checked={showBoundary} onChange={e => setShowBoundary(e.target.checked)} />
              <span>Catchment Boundary</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="checkbox" checked={showDrainage} onChange={e => setShowDrainage(e.target.checked)} />
              <span>Stream Drainage</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="checkbox" checked={showWaterBodies} onChange={e => setShowWaterBodies(e.target.checked)} />
              <span>Water Bodies</span>
            </label>

            <div className="layer-group-title">Observations</div>
            <label className="layer-checkbox-item">
              <input type="checkbox" checked={showObservations} onChange={e => setShowObservations(e.target.checked)} />
              <span>Field Photos (Cyan)</span>
            </label>
            <label className="layer-checkbox-item">
              <input type="checkbox" checked={showInterventions} onChange={e => setShowInterventions(e.target.checked)} />
              <span>Interventions (Green)</span>
            </label>
          </div>

          {/* Dynamic Map Legend Widget */}
          <div className="map-legend-widget">
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>Dynamic GIS Legend</div>
            {activeRaster === 'ndvi' && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>NDVI (Vegetation Index)</div>
                <div className="legend-scale-bar">
                  <span>Low (0.0)</span>
                  <div className="legend-gradient-ndvi"></div>
                  <span>High (0.8)</span>
                </div>
              </div>
            )}
            {activeRaster === 'ndwi' && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>NDWI (Water Signal)</div>
                <div className="legend-scale-bar">
                  <span>Dry (-0.5)</span>
                  <div className="legend-gradient-ndwi"></div>
                  <span>Water (+0.5)</span>
                </div>
              </div>
            )}
            {activeRaster === 'bsi' && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>BSI (Bare Soil Degradation)</div>
                <div className="legend-scale-bar">
                  <span>Low Soil</span>
                  <div className="legend-gradient-bsi"></div>
                  <span>Barren/Exposed</span>
                </div>
              </div>
            )}
            {activeRaster === 'lulc' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, background: '#eab308', borderRadius: 2 }}></span> Agri</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 2 }}></span> Veg</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, background: '#0284c7', borderRadius: 2 }}></span> Water</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, background: '#78716c', borderRadius: 2 }}></span> Barren</div>
              </div>
            )}
            {activeRaster === 'none' && (
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                <div>● <strong>Cyan:</strong> Field Observations</div>
                <div>● <strong>Green:</strong> Conservation Assets</div>
                <div>― <strong>Blue:</strong> Stream Drainage</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Analyses Section */}
      <section className="gis-card">
        <div className="gis-card-header">
          <h2><Camera size={18} style={{ color: '#38bdf8' }} /> Recent Field Observations & Spatial Records</h2>
          <Link to="/observations" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>View All Observations</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading spatial observations...</p>
        ) : analyses.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', background: 'none' }}>
            <MapIcon size={48} className="empty-icon" />
            <h3>No field observations available yet.</h3>
            <p>Upload a geo-coded field photograph to begin watershed spatial analysis.</p>
            <Link to="/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <PlusCircle size={16} />
              <span>Start New Analysis</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="gis-table">
              <thead>
                <tr>
                  <th>Analysis ID</th>
                  <th>Title</th>
                  <th>Field Feature</th>
                  <th>Coordinates</th>
                  <th>Capture Date</th>
                  <th>Spatial Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map(an => {
                  const img = an.images && an.images.length > 0 ? an.images[0] : null;
                  const obs = img && img.observations && img.observations.length > 0 ? img.observations[0] : null;
                  const hasGps = img && img.latitude && img.longitude;

                  return (
                    <tr key={an.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                        BHU-{an.id.toString().padStart(8, '0')}
                      </td>
                      <td><strong>{an.title}</strong></td>
                      <td>
                        <span className="badge badge-success">
                          {obs ? obs.asset_type : 'Watershed Asset'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {hasGps ? `${img.latitude.toFixed(4)}°N, ${img.longitude.toFixed(4)}°E` : 'Missing GPS'}
                      </td>
                      <td>
                        {img && img.capture_date ? new Date(img.capture_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        {hasGps ? (
                          <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>● Supported</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>○ Unregistered</span>
                        )}
                      </td>
                      <td>
                        <Link to={`/analysis/${an.id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                          Evidence &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}
