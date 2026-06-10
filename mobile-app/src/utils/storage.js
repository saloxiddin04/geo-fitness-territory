// MMKV - AsyncStorage ga nisbatan 10x tezroq storage
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'geo-fitness-storage',
  encryptionKey: 'geofit-secret-key-2024',
});

// Qulay wrapper funksiyalar
export const StorageUtils = {
  // JSON ob'ektni saqlash
  setObject: (key, value) => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage setObject error:', e);
    }
  },

  // JSON ob'ektni o'qish
  getObject: key => {
    try {
      const value = storage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Storage getObject error:', e);
      return null;
    }
  },

  // Barcha ma'lumotlarni o'chirish (logout)
  clearAll: () => {
    storage.clearAll();
  },
};
