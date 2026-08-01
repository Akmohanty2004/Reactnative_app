import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const getContacts = createAsyncThunk(
  'chat/getContacts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/chat/contacts');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load contacts');
    }
  }
);

export const getChatHistory = createAsyncThunk(
  'chat/getHistory',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/chat/history/${userId}?t=${Date.now()}`);
      return { userId, messages: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load history');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData, { rejectWithValue }) => {
    try {
      const { tempId, ...dataToSend } = messageData;
      const formData = new FormData();
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] !== undefined && dataToSend[key] !== null) {
          formData.append(key, dataToSend[key]);
        }
      });
      const response = await api.post('/api/chat/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return { ...response.data, tempId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const deleteMessage = createAsyncThunk(
  'chat/deleteMessage',
  async ({ messageId, otherUserId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/chat/message/${messageId}`);
      return { messageId, otherUserId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete message');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    contacts: [],
    messagesByUserId: {},
    isLoadingContacts: false,
    isLoadingHistory: false,
    isSending: false,
    hasUnreadMessages: false,
    error: null,
  },
  reducers: {
    addOptimisticMessage: (state, action) => {
      const message = action.payload;
      const otherUserId = String(message.receiver);
      if (!state.messagesByUserId[otherUserId]) {
        state.messagesByUserId[otherUserId] = [];
      }
      state.messagesByUserId[otherUserId].push(message);
    },
    receiveMessage: (state, action) => {
      const message = action.payload;
      const senderId = String(message.sender?._id || message.sender?.id || (typeof message.sender === 'string' || typeof message.sender === 'number' ? message.sender : ''));
      const receiverId = String(message.receiver?._id || message.receiver?.id || (typeof message.receiver === 'string' || typeof message.receiver === 'number' ? message.receiver : ''));
      const currentId = String(state.currentUserId);
      if (!currentId || currentId === 'null' || currentId === 'undefined') return;
      if (senderId !== currentId && receiverId !== currentId) return;
      const otherUserId = senderId === currentId ? receiverId : senderId;
      
      if (!state.messagesByUserId[otherUserId]) {
        state.messagesByUserId[otherUserId] = [];
      }
      
      // Avoid duplicates
      const exists = state.messagesByUserId[otherUserId].find(m => String(m._id) === String(message._id));
      if (!exists) {
        state.messagesByUserId[otherUserId].push(message);
        state.hasUnreadMessages = true;
        
        // Update contact unread count if we're not currently chatting with them
        if (currentId !== otherUserId) {
          const contactIndex = state.contacts.findIndex(c => String(c._id) === otherUserId);
          if (contactIndex !== -1) {
            state.contacts[contactIndex].unreadCount = (state.contacts[contactIndex].unreadCount || 0) + 1;
          }
        }
      }
    },
    setCurrentUserId: (state, action) => {
      state.currentUserId = action.payload ? String(action.payload) : null;
    },
    clearUnreadMessages: (state) => {
      state.hasUnreadMessages = false;
    },
    removeMessageLocally: (state, action) => {
      const { messageId, otherUserId } = action.payload;
      const key = String(otherUserId);
      if (state.messagesByUserId[key]) {
        state.messagesByUserId[key] = state.messagesByUserId[key].filter(
          m => m._id !== messageId
        );
      }
    },
    setContactOnlineStatus: (state, action) => {
      const { userId, isOnline } = action.payload;
      const contactIndex = state.contacts.findIndex(c => String(c._id) === String(userId));
      if (contactIndex !== -1) {
        state.contacts[contactIndex].isOnline = isOnline;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getContacts.pending, (state) => {
        if (!state.contacts || state.contacts.length === 0) {
          state.isLoadingContacts = true;
        }
        state.error = null;
      })
      .addCase(getContacts.fulfilled, (state, action) => {
        state.isLoadingContacts = false;
        state.contacts = action.payload;
      })
      .addCase(getContacts.rejected, (state, action) => {
        state.isLoadingContacts = false;
        state.error = action.payload;
      })
      .addCase(getChatHistory.pending, (state) => {
        state.isLoadingHistory = true;
        state.error = null;
      })
      .addCase(getChatHistory.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        const key = String(action.payload.userId);
        state.messagesByUserId[key] = action.payload.messages;
        
        // Clear unread count for this contact
        const contactIndex = state.contacts.findIndex(c => String(c._id) === key);
        if (contactIndex !== -1) {
          state.contacts[contactIndex].unreadCount = 0;
        }
      })
      .addCase(getChatHistory.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.error = action.payload;
      })
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false;
        const message = action.payload;
        const otherUserId = String(message.receiver?._id || message.receiver);
        if (!state.messagesByUserId[otherUserId]) {
          state.messagesByUserId[otherUserId] = [];
        }
        if (message.tempId) {
          const tempIndex = state.messagesByUserId[otherUserId].findIndex(m => m._id === message.tempId);
          if (tempIndex !== -1) {
            state.messagesByUserId[otherUserId][tempIndex] = message;
            return;
          }
        }
        const exists = state.messagesByUserId[otherUserId].find(m => String(m._id) === String(message._id));
        if (!exists) {
          state.messagesByUserId[otherUserId].push(message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId, otherUserId } = action.payload;
        const key = String(otherUserId);
        if (state.messagesByUserId[key]) {
          state.messagesByUserId[key] = state.messagesByUserId[key].filter(
            m => m._id !== messageId
          );
        }
      });
  }
});

export const { addOptimisticMessage, receiveMessage, setCurrentUserId, clearUnreadMessages, removeMessageLocally, setContactOnlineStatus } = chatSlice.actions;
export default chatSlice.reducer;
