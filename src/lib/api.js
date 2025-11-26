import axios from 'axios';

class ApiClient {
  client;
  baseURL;

  constructor() {
    // Default to relative '/api' so Vite proxy handles dev, and same-origin in prod
    this.baseURL = import.meta.env.VITE_API_URL || '/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  setApiKey(apiKey) {
    if (apiKey) {
      this.client.defaults.headers.common['x-api-key'] = apiKey;
    } else {
      delete this.client.defaults.headers.common['x-api-key'];
    }
  }

  async get(endpoint, params) {
    const response = await this.client.get(endpoint, { params });
    return response;
  }

  async post(endpoint, data) {
    const response = await this.client.post(endpoint, data);
    return response;
  }

  async put(endpoint, data) {
    const response = await this.client.put(endpoint, data);
    return response;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response;
  }
}

export const api = new ApiClient();