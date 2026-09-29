import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyses, BACKEND_URL } from '../services/api';
import Layout from '../components/Layout';
import { Camera, PlusCircle, MapPin, Search } from 'lucide-react';

export default function FieldObservations() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    getAnalyses()
      .then(data => {
        setAnalyses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = analyses.filter(an => {
    const img = an.images && an.images.length > 0 ? an.images[0] : null;
    const obs = img && img.observations && img.observations.length > 0 ? img.observations[0] : null;
    const asset = obs ? obs.asset_type.toLowerCase() : '';
    const title = an.title.toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase()) || asset.includes(searchTerm.toLowerCase());
    
    if (filterType === 'SUPPORTED') return matchesSearch && img && img.latitude && img.longitude;
    if (filterType === 'ANOMALY') return matchesSearch && (!img || !img.latitude || !img.longitude);
    return matchesSearch;
  });

  return (
    <Layout currentWatershed="Upper Pennar Catchment (SW-07)">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Field Observations & Spatial Records</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Authoritative geo-coded ground evidence records registered with 30m satellite data.
          </p>
        </div>
        <Link to="/new" className="btn btn-primary">
          <PlusCircle size={16} />
          <span>New Field Survey</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input 
            type="text" 
            placeholder="Search by title, feature class, or location..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('ALL')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            All ({analyses.length})
          </button>
          <button 
            className={`btn ${filterType === 'SUPPORTED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('SUPPORTED')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            Spatially Registered
          </button>
        </div>
      </div>

      {/* Observations Grid */}
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading field records...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Camera size={48} className="empty-icon" />
          <h3>No matching field observations</h3>
          <p>Upload a geo-coded image to create your first spatial record.</p>
          <Link to="/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <PlusCircle size={16} />
            <span>Upload Field Image</span>
          </Link>
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map(an => {
            const img = an.images && an.images.length > 0 ? an.images[0] : null;
            const obs = img && img.observations && img.observations.length > 0 ? img.observations[0] : null;
            const hasGps = img && img.latitude && img.longitude;

            return (
              <div key={an.id} className="gis-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {img ? (
                  <div style={{ height: '160px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem', backgroundColor: '#0b1329' }}>
                    <img 
                      src={`${BACKEND_URL}/uploads/${img.filename}`} 
                      alt={img.filename} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/320x160/1e293b/94a3b8?text=Field+Photo';
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ height: '160px', borderRadius: '6px', backgroundColor: '#0b1329', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: '1rem' }}>
                    No Photo Attached
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    BHU-{an.id.toString().padStart(8, '0')}
                  </span>
                  <span className={`badge ${hasGps ? 'badge-success' : 'badge-demo'}`}>
                    {hasGps ? 'SUPPORTED' : 'UNREGISTERED'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '0.35rem' }}>{an.title}</h3>
                <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {obs ? obs.asset_type : 'Watershed Asset'} &bull; {obs ? `${(obs.confidence * 100).toFixed(1)}%` : 'N/A'}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={14} />
                    <span>{hasGps ? `${img.latitude.toFixed(4)}°, ${img.longitude.toFixed(4)}°` : 'No GPS'}</span>
                  </div>
                  <Link to={`/analysis/${an.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                    Evidence &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
