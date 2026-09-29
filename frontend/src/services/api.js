import axios from 'axios';

let rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim().replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api/v1')) {
  rawApiUrl += '/api/v1';
}

export const API_URL = rawApiUrl;
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || API_URL).replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_URL,
});



export const createAnalysis = async (title, description) => {
  const response = await api.post('/analyses/', { title, description });
  return response.data;
};

export const getAnalyses = async () => {
  const response = await api.get('/analyses/');
  return response.data;
};

export const getAnalysis = async (analysisId) => {
  const response = await api.get(`/analyses/${analysisId}`);
  return response.data;
};

export const uploadImage = async (analysisId, file, latitude, longitude) => {
  const formData = new FormData();
  formData.append('file', file);
  if (latitude !== null && latitude !== undefined && latitude !== '') {
    formData.append('latitude', latitude);
  }
  if (longitude !== null && longitude !== undefined && longitude !== '') {
    formData.append('longitude', longitude);
  }

  const response = await api.post(`/analyses/${analysisId}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getSpatialEvidence = async (analysisId, radius = 50) => {
  const response = await api.get(`/analyses/${analysisId}/spatial-evidence`, {
    params: { radius }
  });
  return response.data;
};

export const getWatersheds = async () => {
  const response = await api.get('/watersheds');
  return response.data;
};

export const getWatershedLayers = async (watershedId = 'WS-UP-01') => {
  const response = await api.get(`/watersheds/${watershedId}/layers`);
  return response.data;
};

export const getInterventions = async () => {
  const response = await api.get('/interventions');
  return response.data;
};

export const getChangeDetection = async (watershedId = 'WS-UP-01') => {
  const response = await api.get('/change-detection', {
    params: { watershed_id: watershedId }
  });
  return response.data;
};

export const getSystemStatus = async () => {
  const response = await api.get('/system/status');
  return response.data;
};

export const getAllObservations = async () => {
  const response = await api.get('/observations');
  return response.data;
};
