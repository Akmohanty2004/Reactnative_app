import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadSavedTheme = createAsyncThunk(
  'ui/loadSavedTheme',
  async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      return savedTheme || 'dark';
    } catch {
      return 'dark';
    }
  }
);

const initialState = {
  theme: 'dark', // 'dark' or 'light'
  showChatbot: true,
  notificationsEnabled: true,
  sidebarOpen: true,
  loading: false,
  modal: null,
  notifications: []
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = nextTheme;
      AsyncStorage.setItem('app_theme', nextTheme).catch(() => {});
    },
    toggleChatbot: (state) => {
      state.showChatbot = !state.showChatbot;
    },
    toggleNotificationsEnabled: (state) => {
      state.notificationsEnabled = state.notificationsEnabled === false ? true : false;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      AsyncStorage.setItem('app_theme', action.payload).catch(() => {});
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    showModal: (state, action) => {
      state.modal = action.payload;
    },
    hideModal: (state) => {
      state.modal = null;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadSavedTheme.fulfilled, (state, action) => {
      state.theme = action.payload;
    });
  }
});

export const { toggleTheme, toggleChatbot, toggleNotificationsEnabled, setTheme, toggleSidebar, setLoading, showModal, hideModal } = uiSlice.actions;
export default uiSlice.reducer;