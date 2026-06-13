// API va asosiy konstantalar
import { Platform } from 'react-native';

const PROD_URL = 'https://discerning-mindfulness-production-6edc.up.railway.app';

export const API_BASE_URL = `${PROD_URL}/api/v1`;
export const SOCKET_URL = PROD_URL;

export const MAPBOX_PUBLIC_TOKEN = 'pk.eyJ1Ijoic2Fsb3hpZGRpbjIwMDQiLCJhIjoiY21xOW05ZGdiMDRiczJycXRtaTIyZWppYSJ9.4PC8oZ2x5-jtkE9pU9toEw';

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

// O'zbekiston viloyatlari — backend validator bilan mos (auth.validator.js)
export const UZBEKISTAN_REGIONS = [
  { id: 'toshkent_shahar', name: "Toshkent shahri" },
  { id: 'toshkent_viloyat', name: "Toshkent viloyati" },
  { id: 'andijon', name: "Andijon viloyati" },
  { id: 'buxoro', name: "Buxoro viloyati" },
  { id: 'fargona', name: "Farg'ona viloyati" },
  { id: 'jizzax', name: "Jizzax viloyati" },
  { id: 'qashqadaryo', name: "Qashqadaryo viloyati" },
  { id: 'xorazm', name: "Xorazm viloyati" },
  { id: 'namangan', name: "Namangan viloyati" },
  { id: 'navoiy', name: "Navoiy viloyati" },
  { id: 'samarqand', name: "Samarqand viloyati" },
  { id: 'sirdaryo', name: "Sirdaryo viloyati" },
  { id: 'surxondaryo', name: "Surxondaryo viloyati" },
  { id: 'qoraqalpogiston', name: "Qoraqalpog'iston" },
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
