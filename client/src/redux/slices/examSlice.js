import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import { toast } from 'react-toastify'

// Get teacher exams
export const getTeacherExams = createAsyncThunk(
  'exams/getTeacherExams',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/exams/teacher-exams', { params })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get exams')
    }
  }
)

// Get student exams
export const getStudentExams = createAsyncThunk(
  'exams/getStudentExams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/exams/student/exams')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get exams')
    }
  }
)

// Get exam by ID
export const getExamById = createAsyncThunk(
  'exams/getExamById',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/exams/${examId}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get exam')
    }
  }
)

// Get exam for student
export const getStudentExam = createAsyncThunk(
  'exams/getStudentExam',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/exams/${examId}/student`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get exam')
    }
  }
)

// Create exam
export const createExam = createAsyncThunk(
  'exams/createExam',
  async (examData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/exams/create', examData)
      toast.success('Exam created successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Update exam
export const updateExam = createAsyncThunk(
  'exams/updateExam',
  async ({ examId, examData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/exams/${examId}`, examData)
      toast.success('Exam updated successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Delete exam
export const deleteExam = createAsyncThunk(
  'exams/deleteExam',
  async (examId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/exams/${examId}`)
      toast.success('Exam deleted successfully')
      return examId
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Publish exam
export const publishExam = createAsyncThunk(
  'exams/publishExam',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/exams/${examId}/publish`)
      toast.success('Exam published successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Publish exam results
export const publishExamResults = createAsyncThunk(
  'exams/publishExamResults',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/exams/${examId}/publish-results`)
      toast.success('Exam results published successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to publish exam results'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// Start exam
export const startExam = createAsyncThunk(
  'exams/startExam',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/exams/${examId}/start`)
      toast.success('Exam started successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

// End exam
export const endExam = createAsyncThunk(
  'exams/endExam',
  async (examId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/exams/${examId}/end`)
      toast.success('Exam ended successfully')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to end exam'
      toast.error(message)
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  exams: [],
  currentExam: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 1
}

const examSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearCurrentExam: (state) => {
      state.currentExam = null
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Get student exams
      .addCase(getStudentExams.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(getStudentExams.fulfilled, (state, action) => {
        state.isLoading = false
        state.exams = action.payload.exams || []
      })
      .addCase(getStudentExams.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Get teacher exams
      .addCase(getTeacherExams.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(getTeacherExams.fulfilled, (state, action) => {
        state.isLoading = false
        state.exams = action.payload.exams || []
        state.total = action.payload.total || 0
        state.page = action.payload.page || 1
        state.totalPages = action.payload.totalPages || 1
      })
      .addCase(getTeacherExams.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Get exam by ID
      .addCase(getExamById.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.currentExam = null
      })
      .addCase(getExamById.fulfilled, (state, action) => {
        state.isLoading = false
        state.error = null
        state.currentExam = action.payload.exam
      })
      .addCase(getExamById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Get student exam
      .addCase(getStudentExam.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.currentExam = null
      })
      .addCase(getStudentExam.fulfilled, (state, action) => {
        state.isLoading = false
        state.error = null
        state.currentExam = action.payload
      })
      .addCase(getStudentExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Create exam
      .addCase(createExam.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.isLoading = false
        state.exams.unshift(action.payload.exam)
      })
      .addCase(createExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Update exam
      .addCase(updateExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(updateExam.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.exams.findIndex(e => e._id === action.payload.exam._id)
        if (index !== -1) {
          state.exams[index] = action.payload.exam
        }
        if (state.currentExam && state.currentExam._id === action.payload.exam._id) {
          state.currentExam = action.payload.exam
        }
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Delete exam
      .addCase(deleteExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.isLoading = false
        state.exams = state.exams.filter(e => e._id !== action.payload)
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Publish exam
      .addCase(publishExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(publishExam.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.exams.findIndex(e => e._id === action.payload.exam._id)
        if (index !== -1) {
          state.exams[index] = action.payload.exam
        }
      })
      .addCase(publishExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Publish exam results
      .addCase(publishExamResults.pending, (state) => {
        state.isLoading = true
      })
      .addCase(publishExamResults.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.currentExam && state.currentExam._id === action.payload.exam._id) {
          state.currentExam = action.payload.exam
        }
      })
      .addCase(publishExamResults.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Start exam
      .addCase(startExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(startExam.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.exams.findIndex(e => e._id === action.payload.exam._id)
        if (index !== -1) {
          state.exams[index] = action.payload.exam
        }
      })
      .addCase(startExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // End exam
      .addCase(endExam.pending, (state) => {
        state.isLoading = true
      })
      .addCase(endExam.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.exams.findIndex(e => e._id === action.payload.exam._id)
        if (index !== -1) {
          state.exams[index] = action.payload.exam
        }
      })
      .addCase(endExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

export const { clearCurrentExam, clearError } = examSlice.actions
export default examSlice.reducer
