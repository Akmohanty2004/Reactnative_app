import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { toast } from 'react-toastify'

// Get student results
export const getStudentResults = createAsyncThunk(
  'results/getStudentResults',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/results/my-results')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get results')
    }
  }
)

// Get teacher results for an exam
export const getTeacherResults = createAsyncThunk(
  'results/getTeacherResults',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/results/exam/${examId}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get results')
    }
  }
)

// Submit exam
export const submitExam = createAsyncThunk(
  'results/submitExam',
  async ({ examId, answers, timeTaken, tabSwitches = 0 }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/results/submit', {
        examId,
        answers,
        timeTaken,
        tabSwitches
      })
      toast.success('Exam submitted successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Publish results
export const publishResults = createAsyncThunk(
  'results/publishResults',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/results/${examId}/publish`)
      toast.success('Results published successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish results'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  results: [],
  currentResult: null,
  stats: null,
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
        state.isLoading = true
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
        state.isLoading = true
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
  }
})

export const { clearResults } = resultSlice.actions
export default resultSlice.reducer
