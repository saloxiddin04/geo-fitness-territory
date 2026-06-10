// API va asosiy konstantalar
export const API_BASE_URL = process.env.API_BASE_URL || 'http://10.0.2.2:3000/api/v1';
export const SOCKET_URL = process.env.SOCKET_URL || 'http://10.0.2.2:3000';

// H3 Grid resolution
export const H3_RESOLUTION = 9;

// GPS sozlamalari
export const GPS_CONFIG = {
  // GPS nuqtalarini yozish intervali (millisecond)
  UPDATE_INTERVAL: 5000,
  // Minimum harakatlanish masofasi (metr)
  DISTANCE_FILTER: 10,
  // GPS aniqlik darajasi
  DESIRED_ACCURACY: 0,
  // Background tracking sozlamalari
  BACKGROUND_ACTIVITY_TYPE: 'fitness',
  STOP_TIMEOUT: 5,
  HEARTBEAT_INTERVAL: 60,
};

// Xarita sozlamalari - O'zbekiston markazi
export const MAP_CONFIG = {
  CENTER_LATITUDE: 41.2995,
  CENTER_LONGITUDE: 69.2401,
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 5,
  MAX_ZOOM: 18,
  // Fog of War overlay opacity
  FOG_OPACITY: 0.7,
};

// Hudud ranglari
export const TERRITORY_COLORS = {
  // O'z hududim
  OWN: '#4CAF50',
  OWN_BORDER: '#388E3C',
  // Boshqa foydalanuvchi hududi
  ENEMY: '#F44336',
  ENEMY_BORDER: '#C62828',
  // Neytral / yangi ochilgan hudud
  NEUTRAL: '#2196F3',
  NEUTRAL_BORDER: '#1565C0',
  // Fog of War
  FOG: '#1a1a2e',
};

// XP darajalari
export const XP_PER_LEVEL = 1000;
export const MAX_LEVEL = 100;

// Night Event vaqtlari
export const NIGHT_EVENT = {
  START_HOUR: 20,
  END_HOUR: 23,
  MULTIPLIER: 1.5,
};

// O'zbekiston viloyatlari
export const UZBEKISTAN_REGIONS = [
  { id: 'tashkent', name: "Toshkent shahri" },
  { id: 'tashkent_region', name: "Toshkent viloyati" },
  { id: 'andijan', name: "Andijon viloyati" },
  { id: 'bukhara', name: "Buxoro viloyati" },
  { id: 'fergana', name: "Farg'ona viloyati" },
  { id: 'jizzakh', name: "Jizzax viloyati" },
  { id: 'kashkadarya', name: "Qashqadaryo viloyati" },
  { id: 'khorezm', name: "Xorazm viloyati" },
  { id: 'namangan', name: "Namangan viloyati" },
  { id: 'navoiy', name: "Navoiy viloyati" },
  { id: 'samarkand', name: "Samarqand viloyati" },
  { id: 'sirdarya', name: "Sirdaryo viloyati" },
  { id: 'surkhandarya', name: "Surxondaryo viloyati" },
  { id: 'karakalpakstan', name: "Qoraqalpog'iston" },
];

// AsyncStorage kalitlari
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  FCM_TOKEN: 'fcm_token',
  SETTINGS: 'app_settings',
};

// Socket.IO eventlari
export const SOCKET_EVENTS = {
  // Territory eventlari
  TERRITORY_ATTACKED: 'territory:attacked',
  TERRITORY_CAPTURED: 'territory:captured',
  TERRITORY_DEFENDED: 'territory:defended',
  TERRITORY_SUBSCRIBE: 'territory:subscribe',
  MAP_SUBSCRIBE: 'map:subscribe',
  // Night Event
  NIGHT_EVENT_START: 'night_event:start',
  NIGHT_EVENT_END: 'night_event:end',
  // Leaderboard
  LEADERBOARD_UPDATE: 'leaderboard:update',
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
};

// Running session holatlari
export const SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  SUSPENDED: 'SUSPENDED',
};
