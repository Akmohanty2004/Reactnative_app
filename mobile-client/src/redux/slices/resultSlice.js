import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import Toast from 'react-native-toast-message'

// Get student results
export const getStudentResults = createAsyncThunk(
  'results/getStudentResults',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/results/my-results')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get results')
    }
  }
)

// Get leaderboard
export const getLeaderboard = createAsyncThunk(
  'results/getLeaderboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/results/leaderboard')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get leaderboard')
    }
  }
)

// Get Exam Toppers
export const getToppers = createAsyncThunk(
  'results/getToppers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/results/toppers')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get toppers')
    }
  }
)

// Like Topper
export const likeTopper = createAsyncThunk(
  'results/likeTopper',
  async (resultId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/results/${resultId}/like`)
      return { resultId, data: response.data }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to like' })
      return rejectWithValue(error.response?.data?.message || 'Failed to like')
    }
  }
)

// Get teacher results for an exam
export const getTeacherResults = createAsyncThunk(
  'results/getTeacherResults',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/results/exam/${examId}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get results')
    }
  }
)

// Get all students performance (Teacher)
export const getStudentsPerformance = createAsyncThunk(
  'results/getStudentsPerformance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/users/students-performance')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get students performance')
    }
  }
)

// Submit exam
export const submitExam = createAsyncThunk(
  'results/submitExam',
  async ({ examId, answers, timeTaken, tabSwitches = 0 }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/results/submit', {
        examId,
        answers,
        timeTaken,
        tabSwitches
      })
      Toast.show({ type: 'success', text1: 'Exam submitted successfully!' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit exam'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

// Publish results
export const publishResults = createAsyncThunk(
  'results/publishResults',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/results/${examId}/publish`)
      Toast.show({ type: 'success', text1: 'Results published successfully!' })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish results'
      Toast.show({ type: 'error', text1: message })
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  results: [],
  currentResult: null,
  stats: null,
  leaderboard: [],
  toppers: [],
  studentsPerformance: [],
  isLoading: false,
  error: null
}

const resultSlice = createSlice({
  name: 'results',
  initialState,
  reducers: {
    clearResults: (state) => {
      state.results = []
      state.currentResult = null
      state.stats = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getStudentResults.pending, (state) => {
        if (!state.results || state.results.length === 0) {
          state.isLoading = true
        }
      })
      .addCase(getStudentResults.fulfilled, (state, action) => {
        state.isLoading = false
        state.results = action.payload.results || []
      })
      .addCase(getStudentResults.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(getTeacherResults.pending, (state) => {
        if (!state.results || state.results.length === 0) {
          state.isLoading = true
        }
      })
      .addCase(getTeacherResults.fulfilled, (state, action) => {
        state.isLoading = false
        state.results = action.payload.results || []
        state.stats = action.payload.stats
      })
      .addCase(getTeacherResults.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(submitExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(submitExam.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentResult = action.payload.result
      })
      .addCase(submitExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(publishResults.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(getLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload.leaderboard || []
      })
      .addCase(getToppers.fulfilled, (state, action) => {
        state.toppers = action.payload.toppers || []
      })
      .addCase(likeTopper.fulfilled, (state, action) => {
        const idx = state.toppers.findIndex(t => t.resultId === action.payload.resultId)
        if (idx !== -1) {
          state.toppers[idx].likes = action.payload.data.likes;
          state.toppers[idx].likedByMe = action.payload.data.likedByMe;
        }
      })
      .addCase(getStudentsPerformance.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getStudentsPerformance.fulfilled, (state, action) => {
        state.isLoading = false
        state.studentsPerformance = action.payload.students || []
      })
      .addCase(getStudentsPerformance.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

export const { clearResults } = resultSlice.actions
export default resultSlice.reducer
