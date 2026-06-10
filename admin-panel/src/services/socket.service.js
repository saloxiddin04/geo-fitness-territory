// Admin panel Socket.IO service
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class AdminSocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    const token = localStorage.getItem('admin_token');
    if (!token || this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => console.log('Admin socket ulandi'));
    this.socket.on('disconnect', reason => console.log('Admin socket uzildi:', reason));
  }

  on(event, handler) {
    this.socket?.on(event, handler);
  }

  off(event) {
    this.socket?.off(event);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const adminSocket = new AdminSocketService();
