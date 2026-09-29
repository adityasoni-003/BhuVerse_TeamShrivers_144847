import React, { useEffect, useState } from 'react';
import { getInterventions } from '../services/api';
import Layout from '../components/Layout';
import { ShieldCheck, MapPin, Calendar, CheckCircle2, AlertTriangle, Clock, Layers } from 'lucide-react';

export default function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInterventions()
      .then(data => {
        setInterventions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <Layout currentWatershed="Upper Pennar Catchment (SW-07)">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Watershed Intervention Monitoring</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Continuous spatial & field monitoring for watershed conservation assets and structures.
        </p>
      </div>

      <div className="gis-card">
        <div className="gis-card-header">
          <h2><ShieldCheck size={18} style={{ color: '#38bdf8' }} /> Registered Watershed Conservation Assets</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total: {interventions.length} Structures</span>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading interventions...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="gis-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Structure Type</th>
                  <th>Coordinates</th>
                  <th>Constructed</th>
                  <th>Last Assessed</th>
                  <th>Capacity</th>
                  <th>Spatial Evidence Status</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>{item.id}</td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{item.type}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                    </td>
                    <td>{item.constructed_date}</td>
                    <td>{item.last_assessed}</td>
                    <td>{item.storage_capacity_cum.toLocaleString()} m³</td>
                    <td>
                      <span className={`badge ${
                        item.status_code === 'SUPPORTED' ? 'badge-success' : 
                        item.status_code === 'ANOMALY' ? 'badge-demo' : 'badge-real'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
