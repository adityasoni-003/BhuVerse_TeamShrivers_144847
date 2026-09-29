import React from 'react';
import Layout from '../components/Layout';
import { Database, Satellite, Cpu, Layers, ShieldCheck, Code2 } from 'lucide-react';

export default function DataProvenance() {
  return (
    <Layout currentWatershed="Upper Pennar Catchment">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>System Data & Provenance Architecture</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Technical documentation and sensor provenance specifications for SIH evaluators.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Satellite Data Stack */}
        <div className="gis-card">
          <div className="gis-card-header">
            <h2><Satellite size={18} style={{ color: '#38bdf8' }} /> Satellite Remote Sensing Stack</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
            <div className="meta-key-value">
              <span className="meta-key">Primary Sensor:</span>
              <span className="meta-val">Landsat-9 OLI-2 & Sentinel-2 MSI Harmonized</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Native Spatial Resolution:</span>
              <span className="meta-val">30m (Landsat-9) / 10m-20m (Sentinel-2)</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Analysis Resolution:</span>
              <span className="meta-val" style={{ color: '#10b981' }}>30.0m Validated Orthorectified Grid</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Coordinate Reference System:</span>
              <span className="meta-val">EPSG:32643 (UTM Zone 43N) / WGS 84</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">STAC API Endpoint:</span>
              <span className="meta-val">SRISHTI-DRISHTI Geospatial Catalog</span>
            </div>
          </div>
        </div>

        {/* AI Model Stack */}
        <div className="gis-card">
          <div className="gis-card-header">
            <h2><Cpu size={18} style={{ color: '#38bdf8' }} /> AI Ground Feature Engine</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
            <div className="meta-key-value">
              <span className="meta-key">Model Architecture:</span>
              <span className="meta-val">Custom Watershed YOLOv8 Deep CNN</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Validation & Safety:</span>
              <span className="meta-val">Generic COCO classes rejected automatically</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Trained Asset Classes:</span>
              <span className="meta-val">Farm Pond, Check Dam, Canal, Stream, etc.</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Inference Framework:</span>
              <span className="meta-val">PyTorch / Ultralytics Backend</span>
            </div>
            <div className="meta-key-value">
              <span className="meta-key">Geocoding Pipeline:</span>
              <span className="meta-val">Lossless EXIF GPS Extraction + PostGIS WKT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-spectral Band Index Formulas */}
      <div className="gis-card">
        <div className="gis-card-header">
          <h2><Code2 size={18} style={{ color: '#38bdf8' }} /> Authoritative Multi-Spectral Remote Sensing Formulas</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>NDVI (Vegetation Index)</div>
            <code style={{ fontFamily: 'var(--font-mono)', color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
              (NIR - Red) / (NIR + Red)
            </code>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Quantifies photosynthetic canopy vigor and vegetation density across the 30m grid.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem' }}>NDWI (Water Index)</div>
            <code style={{ fontFamily: 'var(--font-mono)', color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
              (Green - NIR) / (Green + NIR)
            </code>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Delineates open water bodies, check dam reservoirs, farm ponds, and saturated drainage channels.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '0.4rem' }}>BSI (Bare Soil Index)</div>
            <code style={{ fontFamily: 'var(--font-mono)', color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
              ((SWIR2+Red)-(NIR+Blue)) / ((SWIR2+Red)+(NIR+Blue))
            </code>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Detects bare soil exposure, land degradation, and erosion susceptibility in dry catchments.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
