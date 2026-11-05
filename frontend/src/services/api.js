import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ev_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ev_token');
      localStorage.removeItem('ev_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { message: 'Network error' });
  }
);

export default api;

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateLocation: (data) => api.put('/auth/location', data),
};

// ==================== STATIONS ====================
export const stationAPI = {
  getNearby: (params) => api.get('/stations/nearby', { params }),
  getAll: (params) => api.get('/stations', { params }),
  getById: (id) => api.get(`/stations/${id}`),
  create: (data) => api.post('/stations', data),
  update: (id, data) => api.put(`/stations/${id}`, data),
  delete: (id) => api.delete(`/stations/${id}`),
  rate: (id, data) => api.post(`/stations/${id}/rate`, data),
};

// ==================== SESSIONS ====================
export const sessionAPI = {
  start: (data) => api.post('/sessions/start', data),
  end: (id, data) => api.put(`/sessions/${id}/end`, data),
  getHistory: (params) => api.get('/sessions/history', { params }),
  getActive: () => api.get('/sessions/active'),
  predictWait: (stationId) => api.get(`/sessions/predict-wait/${stationId}`),
  getAllAdmin: (params) => api.get('/sessions/admin/all', { params }),
};

// ==================== FAULTS ====================
export const faultAPI = {
  report: (data) => api.post('/faults/report', data),
  getByStation: (stationId, params) => api.get(`/faults/${stationId}`, { params }),
  upvote: (id) => api.post(`/faults/${id}/upvote`),
  resolve: (id, data) => api.put(`/faults/${id}/resolve`, data),
  getAllAdmin: (params) => api.get('/faults/admin/all', { params }),
};

// ==================== ANALYTICS ====================
export const analyticsAPI = {
  getPeakHours: (params) => api.get('/analytics/peak-hours', { params }),
  getUsageTrends: (params) => api.get('/analytics/usage-trends', { params }),
  getOccupancyRate: (params) => api.get('/analytics/occupancy-rate', { params }),
  getWeatherImpact: () => api.get('/analytics/weather-impact'),
  getDashboardStats: () => api.get('/analytics/dashboard-stats'),
  getAvgWaitTime: (stationId) => api.get(`/analytics/avg-wait-time/${stationId}`),
};
