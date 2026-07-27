import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = '/api'

// Login user (Sends OTP)
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/auth/login`, {
        email,
        password,
        role
      })
      Toast.show({ type: 'success', text1: response.data.message || 'OTP Sent successfully!' })
      return { ...response.data, email, role, password }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Verify Login OTP
export const verifyLoginUser = createAsyncThunk(
  'auth/verifyLogin',
  async ({ email, password, role, otp }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/auth/verify-login`, {
        email,
        password,
        role,
        otp
      })
      
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token)
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user))
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
      }
      
      Toast.show({ type: 'success', text1: 'Login successful!' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'OTP Verification failed'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Register user (Sends OTP)
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/auth/register`, userData)
      Toast.show({ type: 'success', text1: response.data.message || 'OTP Sent successfully!' })
      return { ...response.data, userData }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Verify Register OTP
export const verifyRegisterUser = createAsyncThunk(
  'auth/verifyRegister',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/auth/verify-register`, userData)
      
      Toast.show({ type: 'success', text1: response.data.message || 'Registration successful! Please login.' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'OTP Verification failed'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Get current user - ONLY DECLARED ONCE
export const getCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        return rejectWithValue('No token found')
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get(`${API_URL}/auth/me`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get user')
    }
  }
)

// Init Auth (Check AsyncStorage on app load)
export const initAuth = createAsyncThunk(
  'auth/initAuth',
  async (_, { dispatch }) => {
    try {
      const token = await AsyncStorage.getItem('token')
      const userStr = await AsyncStorage.getItem('user')
      if (token && userStr) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const user = JSON.parse(userStr)
        // Optionally fetch fresh user data here using getCurrentUser
        return { token, user }
      }
      return null
    } catch (error) {
      console.error('Error during initAuth', error)
      return null
    }
  }
)

// Logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('token')
      await AsyncStorage.removeItem('user')
      delete api.defaults.headers.common['Authorization']
      
      api.post(`${API_URL}/auth/logout`).catch(() => {})
      
      Toast.show({ type: 'success', text1: 'Logged out successfully' })
      return true
    } catch (error) {
      await AsyncStorage.removeItem('token')
      await AsyncStorage.removeItem('user')
      delete api.defaults.headers.common['Authorization']
      Toast.show({ type: 'success', text1: 'Logged out successfully' })
      return true
    }
  }
)

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.put(`${API_URL}/users/profile`, userData)
      
      const userStr = await AsyncStorage.getItem('user')
      const currentUser = JSON.parse(userStr || '{}')
      const updatedUser = { ...currentUser, ...response.data.user }
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser))
      
      Toast.show({ type: 'success', text1: 'Profile updated successfully' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Upload profile image
export const uploadProfileImage = createAsyncThunk(
  'auth/uploadProfileImage',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API_URL}/users/upload-profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const userStr = await AsyncStorage.getItem('user')
      const currentUser = JSON.parse(userStr || '{}')
      currentUser.profileImage = response.data.imageUrl || response.data.user?.profileImage
      await AsyncStorage.setItem('user', JSON.stringify(currentUser))
      
      Toast.show({ type: 'success', text1: 'Profile image updated successfully' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload image'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Change password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${API_URL}/users/change-password`, {
        currentPassword,
        newPassword
      })
      Toast.show({ type: 'success', text1: 'Password changed successfully' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  user: null,
  token: null,
  isInitializing: true, // For the main AppNavigator splash screen
  isLoading: false, // For component local buttons
  error: null,
  isAuthenticated: false,
  loginOtpSent: false,
  registerOtpSent: false,
  loginEmail: '',
  loginRole: '',
  loginPassword: '',
  registrationData: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
      state.loginOtpSent = false
      state.registerOtpSent = false
      state.loginEmail = ''
      state.loginRole = ''
      state.loginPassword = ''
      state.registrationData = null
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      AsyncStorage.setItem('user', JSON.stringify(state.user))
    },
    resetAuth: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.error = null
      state.isLoading = false
      state.loginOtpSent = false
      state.registerOtpSent = false
      state.loginEmail = ''
      state.loginRole = ''
      state.loginPassword = ''
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.loginOtpSent = true
        state.loginEmail = action.payload.email || ''
        state.loginRole = action.payload.role || ''
        state.loginPassword = action.payload.password || ''
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Verify Login
      .addCase(verifyLoginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyLoginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
        state.loginOtpSent = false
        state.registerOtpSent = false
        state.registrationData = null
      })
      .addCase(verifyLoginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.registerOtpSent = true
        state.registrationData = action.payload.userData || null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Verify Register
      .addCase(verifyRegisterUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyRegisterUser.fulfilled, (state, action) => {
        state.isLoading = false
        // DO NOT log the user in automatically after registration.
        // We want them to navigate to the Login page and login manually.
        state.registerOtpSent = false
        state.registrationData = null
      })
      .addCase(verifyRegisterUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Init Auth
      .addCase(initAuth.pending, (state) => {
        state.isInitializing = true
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.isInitializing = false
        if (action.payload) {
          state.isAuthenticated = true
          state.user = action.payload.user
          state.token = action.payload.token
        } else {
          state.isAuthenticated = false
        }
      })
      .addCase(initAuth.rejected, (state) => {
        state.isInitializing = false
        state.isAuthenticated = false
      })
      
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        // Fetching silently in the background so it doesn't unmount AppNavigator
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.error = action.payload
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.error = null
        state.isLoading = false
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.error = null
        state.isLoading = false
      })
      
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload.user }
      })
      
      // Upload profile image
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        if (action.payload.user) {
          state.user = { ...state.user, ...action.payload.user }
        } else if (action.payload.imageUrl) {
          state.user = { ...state.user, profileImage: action.payload.imageUrl }
        }
      })
  }
})

export const { clearError, updateUser, resetAuth } = authSlice.actions
export default authSlice.reducer
