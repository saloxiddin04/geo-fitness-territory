// Socket.IO service - real-time eventlar uchun
import { io } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS, STORAGE_KEYS } from '../constants';
import { storage } from '../utils/storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
  }

  // Socket ulanishini boshlash
  connect() {
    if (this.socket?.connected) return;

    const token = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.warn('Socket: Token topilmadi, ulanish bekor');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this._setupListeners();
  }

  // Asosiy event listenerlarni sozlash
  _setupListeners() {
    this.socket.on('connect', () => {
      console.log('Socket ulantirildi:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', reason => {
      console.log('Socket uzildi:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', error => {
      console.error('Socket ulanish xatosi:', error.message);
      this.reconnectAttempts++;
    });

    // Saqlangan handler larni qayta ro'yxatdan o'tkazish
    this.eventHandlers.forEach((handler, event) => {
      this.socket.on(event, handler);
    });
  }

  // Event tinglash
  on(event, handler) {
    this.eventHandlers.set(event, handler);
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  // Event tinglashni to'xtatish
  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Event yuborish
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket ulanmagan, event yuborilmadi:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  // Xarita hududiga subscribe bo'lish
  subscribeToMap(bounds) {
    this.emit(SOCKET_EVENTS.MAP_SUBSCRIBE, bounds);
  }

  // Hudud eventlariga subscribe
  subscribeToTerritory(h3Index) {
    this.emit(SOCKET_EVENTS.TERRITORY_SUBSCRIBE, { h3Index });
  }

  // Ulanishni uzish
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
    }
  }

  // Ulanish holati
  getStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
export const socketService = new SocketService();
