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

// A 401 on an *authenticated* request means the session expired — clear it
// and bounce to login. A 401 on a request with no token (wrong password on
// /auth/login, an expired reset link, etc.) is just a normal rejected
// request; force-navigating away would blow past the page before it can
// show the error, so only the token case triggers the redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (username, password, remember) =>
  api.post('/auth/login', { username, password, remember });
export const forgotPassword = (email) => api.post('/auth/forgot', { email });
export const validateResetToken = (token) =>
  api.get('/auth/reset/validate', { params: { token } });
export const resetPassword = (token, password) =>
  api.post('/auth/reset', { token, password });

// Registration is multipart: includes a required selfie image + gender
export const register = ({ username, email, password, fullName, gender, selfie }) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);
  if (fullName) formData.append('fullName', fullName);
  formData.append('gender', gender);
  formData.append('selfie', selfie);
  return api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateProfile = ({ gender, selfie }) => {
  const formData = new FormData();
  if (gender) formData.append('gender', gender);
  if (selfie) formData.append('selfie', selfie);
  return api.put('/auth/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Trip membership endpoints
export const inviteToTrip = (tripId, username) =>
  api.post(`/trips/${tripId}/invite`, { username });
export const getInvitations = () => api.get('/trips/invitations');
export const respondToInvitation = (inviteId, accept) =>
  api.post(`/trips/invitations/${inviteId}/respond`, { accept });

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

// Dynamic-event sub-activity endpoints (nested under a trip item)
export const createActivity = (tripId, itemId, data) =>
  api.post(`/trips/${tripId}/items/${itemId}/activities`, data);
export const updateActivity = (tripId, itemId, activityId, data) =>
  api.put(`/trips/${tripId}/items/${itemId}/activities/${activityId}`, data);
export const deleteActivity = (tripId, itemId, activityId) =>
  api.delete(`/trips/${tripId}/items/${itemId}/activities/${activityId}`);

// Trip group (sub-itinerary) endpoints
export const createGroup = (tripId, data) => api.post(`/trips/${tripId}/groups`, data);
export const updateGroup = (tripId, groupId, data) =>
  api.put(`/trips/${tripId}/groups/${groupId}`, data);
export const deleteGroup = (tripId, groupId) => api.delete(`/trips/${tripId}/groups/${groupId}`);

// Idea board endpoints
export const getIdeas = (tripId) => api.get(`/trips/${tripId}/ideas`);
export const createIdea = (tripId, data) => api.post(`/trips/${tripId}/ideas`, data);
export const promoteIdea = (tripId, ideaId) => api.post(`/trips/${tripId}/ideas/${ideaId}/promote`);
export const deleteIdea = (tripId, ideaId) => api.delete(`/trips/${tripId}/ideas/${ideaId}`);

// Photo endpoints
export const uploadPhoto = (tripItemId, file, caption) => {
  const formData = new FormData();
  formData.append('photo', file);
  if (caption) formData.append('caption', caption);
  return api.post(`/photos/${tripItemId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getPhotos = (tripItemId) => api.get(`/photos/${tripItemId}`);
export const getAllPhotos = (tripId) =>
  api.get('/photos', { params: tripId ? { trip_id: tripId } : {} });
export const deletePhoto = (photoId) => api.delete(`/photos/${photoId}`);

// Place search (Nominatim) + fun facts (Wikipedia), proxied by the server
export const searchPlaces = (query) => api.get(`/places/search`, { params: { query } });
export const getPlaceFunFact = ({ wikipedia, name, lat, lon }) =>
  api.get(`/places/funfact`, { params: { wikipedia, name, lat, lon } });

export default api;
