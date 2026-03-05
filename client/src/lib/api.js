import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const register = (userData) =>
  api.post('/auth/register', userData);

// Trip endpoints
export const getTrips = () => api.get('/trips');
export const getTrip = (id) => api.get(`/trips/${id}`);
export const createTrip = (data) => api.post('/trips', data);
export const updateTrip = (id, data) => api.put(`/trips/${id}`, data);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);

// Trip items endpoints
export const getTripItems = (tripId) => api.get(`/trips/${tripId}/items`);
export const createTripItem = (tripId, data) => api.post(`/trips/${tripId}/items`, data);
export const updateTripItem = (tripId, itemId, data) => api.put(`/trips/${tripId}/items/${itemId}`, data);
export const deleteTripItem = (tripId, itemId) => api.delete(`/trips/${tripId}/items/${itemId}`);
export const reorderTripItems = (tripId, items) => api.put(`/trips/${tripId}/items/reorder`, { items });

// Photo endpoints
export const uploadPhoto = (tripItemId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.post(`/photos/${tripItemId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getPhotos = (tripItemId) => api.get(`/photos/${tripItemId}`);
export const deletePhoto = (photoId) => api.delete(`/photos/${photoId}`);

// Google Places API proxy
export const searchPlaces = (query) => api.get(`/places/search`, { params: { query } });
export const getPlaceDetails = (placeId) => api.get(`/places/details/${placeId}`);

export default api;
