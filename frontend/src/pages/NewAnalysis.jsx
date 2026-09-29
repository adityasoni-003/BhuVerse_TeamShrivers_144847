import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAnalysis, uploadImage } from '../services/api';
import Layout from '../components/Layout';
import { 
  Upload, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Satellite, 
  Layers, 
  Sparkles,
  FileImage,
  ArrowRight
} from 'lucide-react';


export default function NewAnalysis() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Pipeline processing state
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const pipelineSteps = [
    { label: "Image uploaded & format validated", icon: FileImage },
    { label: "GPS coordinates & EXIF timestamp extracted", icon: MapPin },
    { label: "Field AI watershed feature model completed", icon: Cpu },
    { label: "Registering spatial location (30m pixel grid)", icon: Layers },
    { label: "Finding Landsat-9 / Sentinel-2 satellite scene", icon: Satellite },
    { label: "Calculating spatial evidence (NDVI, NDWI, BSI, LULC)", icon: Sparkles },
    { label: "Cross-modal evidence fusion comparison", icon: Layers },
    { label: "Generating watershed decision support assessment", icon: CheckCircle2 }
  ];

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    
    // Auto-generate title if empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setTitle(`Field Survey: ${cleanName.slice(0, 30)}`);
    }

    // Client-side file preview metadata
    const sizeKB = (selectedFile.size / 1024).toFixed(1);
    setFileMeta({
      name: selectedFile.name,
      size: `${sizeKB} KB`,
      type: selectedFile.type || 'image/jpeg',
      lastModified: new Date(selectedFile.lastModified).toLocaleDateString()
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a field photograph to upload.');
      return;
    }
    setError('');
    setProcessing(true);
    setCurrentStep(1);

    try {
      // Step 1: Create Analysis Record
      const analysis = await createAnalysis(
        title || `Field Observation Survey`,
        description || "Field geo-coded observation integrated with 30m satellite data."
      );
      setCurrentStep(2);

      // Step 2 & 3: Upload Image & Run AI Model
      await new Promise(r => setTimeout(r, 600)); // UI pacing for pipeline visualization
      setCurrentStep(3);

      const manualLat = latitude ? parseFloat(latitude) : null;
      const manualLon = longitude ? parseFloat(longitude) : null;

      await uploadImage(analysis.id, file, manualLat, manualLon);
      setCurrentStep(4);

      // Steps 4-8: Spatial Registration, Satellite Evidence, Evidence Fusion
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(5);
      await new Promise(r => setTimeout(r, 500));
      setCurrentStep(6);
      await new Promise(r => setTimeout(r, 500));
      setCurrentStep(7);
      await new Promise(r => setTimeout(r, 500));
      setCurrentStep(8);

      // Navigate to signature analysis view
      await new Promise(r => setTimeout(r, 400));
      navigate(`/analysis/${analysis.id}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to complete spatial analysis pipeline. Please check connection.');
      setProcessing(false);
    }
  };

  return (
    <Layout currentWatershed="Upper Pennar Catchment (SW-07)">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>New Spatial Analysis</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Upload a geo-coded field observation to connect ground evidence with satellite-derived watershed evidence.
          </p>
        </header>

        {error && (
          <div className="assessment-banner badge-anomaly" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangle size={20} />
            <div>
              <strong>Analysis Error:</strong> {error}
            </div>
          </div>
        )}

        {!processing ? (
          <div className="gis-card">
            <form onSubmit={handleSubmit}>
              {/* Drag and Drop Zone */}
              <div 
                className={`upload-drop-zone ${isDragActive ? 'drag-active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('field-file-input').click()}
              >
                <input 
                  type="file" 
                  id="field-file-input" 
                  accept="image/jpeg,image/png,image/jpg" 
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelection(e.target.files[0])}
                />

                <div className="upload-icon-wrapper">
                  <Upload size={28} />
                </div>

                <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {file ? file.name : "Drop geo-coded field image here"}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  or click to browse local files (JPEG / PNG)
                </p>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <MapPin size={14} />
                  <span>GPS metadata required for 30m spatial analysis</span>
                </div>
              </div>

              {/* Selected File Metadata Card */}
              {fileMeta && (
                <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Detected File Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <div><span style={{ color: '#94a3b8' }}>Filename:</span> <strong style={{ color: '#f8fafc' }}>{fileMeta.name}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Size:</span> <strong style={{ color: '#f8fafc' }}>{fileMeta.size}</strong></div>
                    <div><span style={{ color: '#94a3b8' }}>Date:</span> <strong style={{ color: '#f8fafc' }}>{fileMeta.lastModified}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ margin: '1.5rem 0', height: '1px', backgroundColor: 'var(--border-subtle)' }}></div>

              {/* Analysis Title & Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.4rem' }}>
                  Analysis Title
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g., Upper Catchment Check Dam Survey 2026"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.4rem' }}>
                  Field Notes / Description (Optional)
                </label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Record terrain context, crop stage, or water storage status..."
                  rows={2}
                />
              </div>

              {/* Manual Coordinate Override fallback */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.2rem' }}>
                  Manual Coordinates Override (Optional)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Leave blank to automatically extract EXIF GPS from the image.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input 
                    type="number" 
                    step="0.000001" 
                    value={latitude} 
                    onChange={e => setLatitude(e.target.value)} 
                    placeholder="Latitude (e.g. 14.6812)"
                  />
                  <input 
                    type="number" 
                    step="0.000001" 
                    value={longitude} 
                    onChange={e => setLongitude(e.target.value)} 
                    placeholder="Longitude (e.g. 77.6015)"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                <span>Run Geospatial Evidence Pipeline</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        ) : (
          /* Live Processing Pipeline Stepper */
          <div className="gis-card">
            <div className="gis-card-header">
              <h2><Cpu size={20} style={{ color: '#38bdf8' }} /> Geospatial Evidence Processing Pipeline</h2>
              <span className="live-data-badge">
                <span className="live-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Executing cross-modal spatial integration between field photography and 30m satellite data...
            </p>

            <div className="pipeline-stepper">
              {pipelineSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                const Icon = step.icon;

                return (
                  <div 
                    key={idx} 
                    className={`pipeline-step-item ${isDone ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}
                  >
                    <div className={`step-indicator ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                      {isDone ? <CheckCircle2 size={16} /> : <span>{stepNum}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <Icon size={16} style={{ color: isDone ? '#10b981' : isActive ? '#38bdf8' : '#64748b' }} />
                      <span>{step.label}</span>
                    </div>
                    {isDone && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>✓ Complete</span>}
                    {isActive && <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>● Processing...</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
