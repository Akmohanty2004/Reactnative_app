import { io } from 'socket.io-client';
import api from './api';

let socket = null;

export const getSocket = (userId) => {
  const baseUrl = api.defaults.baseURL || 'https://exam-app-backend-vqos.vercel.app';

  if (!socket) {
    socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 10000,
      autoConnect: true,
    });
  }

  if (socket && !socket.connected) {
    socket.connect();
  }

  if (userId && socket) {
    const uidStr = String(userId);
    socket.emit('join_room', uidStr);
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  getSocket,
  disconnectSocket,
};
