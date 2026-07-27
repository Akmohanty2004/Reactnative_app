import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: 'dark', // 'dark' or 'light'
  sidebarOpen: true,
  loading: false,
  modal: null,
  notifications: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    showModal: (state, action) => {
      state.modal = action.payload
    },
    hideModal: (state) => {
      state.modal = null
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout/fulfilled', (state) => {
      state.theme = 'dark'
    })
  }
})

export const { toggleTheme, setTheme, toggleSidebar, setLoading, showModal, hideModal } = uiSlice.actions
export default uiSlice.reducer