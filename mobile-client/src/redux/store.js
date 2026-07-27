import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import examReducer from './slices/examSlice'
import resultReducer from './slices/resultSlice'
import notificationReducer from './slices/notificationSlice'
import uiReducer from './slices/uiSlice'
import adminReducer from './slices/adminSlice'
import chatReducer from './slices/chatSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exams: examReducer,
    results: resultReducer,
    notifications: notificationReducer,
    ui: uiReducer,
    admin: adminReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})