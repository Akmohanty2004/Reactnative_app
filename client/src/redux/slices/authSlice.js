import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_URL = '/api'

// Login user (Sends OTP)
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        role
      })
      toast.success(response.data.message || 'OTP Sent successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Verify Login OTP
export const verifyLoginUser = createAsyncThunk(
  'auth/verifyLogin',
  async ({ email, password, role, otp }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-login`, {
        email,
        password,
        role,
        otp
      })
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
      }
      
      toast.success('Successfully added OTP system like. Login successful!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'OTP Verification failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Register user (Sends OTP)
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData)
      toast.success(response.data.message || 'OTP Sent successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Verify Register OTP
export const verifyRegisterUser = createAsyncThunk(
  'auth/verifyRegister',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-register`, userData)
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
      }
      
      toast.success('Successfully added OTP system like. Registration successful!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'OTP Verification failed'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Get current user - ONLY DECLARED ONCE
export const getCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return rejectWithValue('No token found')
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await axios.get(`${API_URL}/auth/me`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get user')
    }
  }
)

// Logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
      
      axios.post(`${API_URL}/auth/logout`).catch(() => {})
      
      toast.success('Logged out successfully')
      return true
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
      toast.success('Logged out successfully')
      return true
    }
  }
)

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData)
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = { ...currentUser, ...response.data.user }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      toast.success('Profile updated successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Upload profile image
export const uploadProfileImage = createAsyncThunk(
  'auth/uploadProfileImage',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/users/upload-profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      currentUser.profileImage = response.data.imageUrl || response.data.user?.profileImage
      localStorage.setItem('user', JSON.stringify(currentUser))
      
      toast.success('Profile image updated successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload image'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Change password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/users/change-password`, {
        currentPassword,
        newPassword
      })
      toast.success('Password changed successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token')
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('user', JSON.stringify(state.user))
    },
    resetAuth: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.error = null
      state.isLoading = false
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.isLoading = false
        // DO NOT set isAuthenticated true here, it is just OTP sent
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
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false
        // DO NOT set isAuthenticated true here, it is just OTP sent
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
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.token
      })
      .addCase(verifyRegisterUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true
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
