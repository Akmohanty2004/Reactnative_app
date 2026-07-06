import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { toast } from 'react-toastify'

export const getAdminDashboardStats = createAsyncThunk(
  'admin/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/dashboard-stats')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get stats')
    }
  }
)

export const getUsers = createAsyncThunk(
  'admin/getUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/users')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get users')
    }
  }
)

export const getAdminExams = createAsyncThunk(
  'admin/getExams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/admin/exams')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get exams')
    }
  }
)

export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/admin/users/${userId}`)
      toast.success('User deleted successfully')
      return userId
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
      return rejectWithValue(error.response?.data?.message || 'Failed to delete user')
    }
  }
)

const initialState = {
  stats: null,
  users: [],
  exams: [],
  isLoading: false,
  error: null
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAdminDashboardStats.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getAdminDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.stats = {
          ...action.payload.stats,
          monthlyExams: action.payload.monthlyExams,
          monthlyResults: action.payload.monthlyResults,
          memoryUsage: action.payload.memoryUsage,
          activeUsers: action.payload.activeUsers
        }
      })
      .addCase(getAdminDashboardStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(getUsers.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.users = action.payload.users || []
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(getAdminExams.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getAdminExams.fulfilled, (state, action) => {
        state.isLoading = false
        state.exams = action.payload.exams || []
      })
      .addCase(getAdminExams.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user._id !== action.payload)
      })
  }
})

export default adminSlice.reducer
