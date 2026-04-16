import axios from 'axios';

// Auto-detect environment
const getApiUrl = () => {
  // Check if we're in production (deployed)
  const isProduction = window.location.hostname !== 'localhost' && 
                       !window.location.hostname.includes('127.0.0.1') &&
                       !window.location.hostname.includes('192.168.');
  
  if (isProduction) {
    // Production: use Render backend
    return 'https://rms-backend-1t69.onrender.com';
  }
  
  // Development: try local backend first
  // Pwede mo rin itong gawing dynamic
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Log environment (for debugging only - remove in production)
if (process.env.NODE_ENV !== 'production') {
  console.log(`🌍 Environment: ${window.location.hostname === 'localhost' ? 'Development' : 'Production'}`);
  console.log(`🔗 API URL: ${API_BASE_URL}`);
}

// Request interceptor - add auth token if needed
api.interceptors.request.use(
  (config) => {
    // You can add token here later
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Redirect to login or clear session
        console.log('Unauthorized! Please login again.');
        // localStorage.removeItem('token');
        // window.location.href = '/login';
      }
    } else if (error.request) {
      // Request was made but no response
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;