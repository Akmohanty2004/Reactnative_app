import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Platform } from 'react-native'
import Constants from 'expo-constants'

const getBaseUrl = () => {
  try {
    const hostUri = 
      Constants.expoConfig?.hostUri || 
      Constants.manifest2?.extra?.expoClient?.hostUri || 
      Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (err) {
    console.warn('Could not detect Expo host IP:', err);
  }
  return 'http://10.200.189.83:5000';
};

const api = axios.create({
  baseURL: 'https://exam-app-backend-vqos.vercel.app',
  // baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

let inMemoryToken = null;

export const setAuthToken = (token) => {
  inMemoryToken = token;
};

api.interceptors.request.use(
  async (config) => {
    try {
      if (!inMemoryToken) {
        inMemoryToken = await AsyncStorage.getItem('token');
      }
      if (inMemoryToken) {
        config.headers.Authorization = `Bearer ${inMemoryToken}`;
      }
    } catch (error) {
      console.error('Error reading token from AsyncStorage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/verify-login')) {
        return Promise.reject(error);
      }
      try {
        inMemoryToken = null;
        await AsyncStorage.removeItem('token')
        await AsyncStorage.removeItem('user')
        
        // Lazily require store to avoid circular dependency and dispatch logout
        const { store } = require('../redux/store');
        if (store) {
          store.dispatch({ type: 'auth/logout/fulfilled' });
        }
      } catch (err) {
        console.error('Error removing token', err)
      }
    }
    return Promise.reject(error)
  }
)

export default api