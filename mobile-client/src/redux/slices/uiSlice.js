import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  theme: 'dark', // 'dark' or 'light'
  showChatbot: true,
  notificationsEnabled: true,
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
    toggleChatbot: (state) => {
      state.showChatbot = !state.showChatbot
    },
    toggleNotificationsEnabled: (state) => {
      state.notificationsEnabled = state.notificationsEnabled === false ? true : false
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

export const { toggleTheme, toggleChatbot, toggleNotificationsEnabled, setTheme, toggleSidebar, setLoading, showModal, hideModal } = uiSlice.actions
export default uiSlice.reducer