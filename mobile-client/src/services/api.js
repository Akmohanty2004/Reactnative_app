import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'

const api = axios.create({
  baseURL: 'https://exam-app-backend-vqos.vercel.app',

  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Error reading token from AsyncStorage', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/verify-login')) {
        return Promise.reject(error);
      }
      try {
        await AsyncStorage.removeItem('token')
        await AsyncStorage.removeItem('user')
      } catch (err) {
        console.error('Error removing token', err)
      }
    }
    return Promise.reject(error)
  }
)

export default api