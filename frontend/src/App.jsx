import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FieldObservations from './pages/FieldObservations';
import NewAnalysis from './pages/NewAnalysis';
import AnalysisResult from './pages/AnalysisResult';
import WatershedExplorer from './pages/WatershedExplorer';
import ChangeDetection from './pages/ChangeDetection';
import Interventions from './pages/Interventions';
import Reports from './pages/Reports';
import DataProvenance from './pages/DataProvenance';
import SystemStatus from './pages/SystemStatus';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/observations" element={<FieldObservations />} />
        <Route path="/new" element={<NewAnalysis />} />
        <Route path="/analysis/:id" element={<AnalysisResult />} />
        <Route path="/explorer" element={<WatershedExplorer />} />
        <Route path="/change-detection" element={<ChangeDetection />} />
        <Route path="/interventions" element={<Interventions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/provenance" element={<DataProvenance />} />
        <Route path="/status" element={<SystemStatus />} />
      </Routes>
    </Router>
  );
}

export default App;
