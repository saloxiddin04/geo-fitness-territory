import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache — synchronous getString/set API ni saqlab qoladi
// App ochilganda hydrate() chaqiriladi va AsyncStorage dan yuklanadi
const memCache = new Map();

export const storage = {
  getString: key => memCache.get(key) ?? null,

  set: (key, value) => {
    const strValue = typeof value === 'string' ? value : String(value);
    memCache.set(key, strValue);
    AsyncStorage.setItem(key, strValue).catch(() => {});
  },

  delete: key => {
    memCache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },

  clearAll: () => {
    memCache.clear();
    AsyncStorage.clear().catch(() => {});
  },

  // App start bo'lganda chaqiriladi — AsyncStorage dan keshga yuklaydi
  hydrate: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (!keys || keys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([key, value]) => {
        if (value !== null) memCache.set(key, value);
      });
    } catch (e) {
      console.warn('Storage hydrate error:', e.message);
    }
  },
};

export const StorageUtils = {
  setObject: (key, value) => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage setObject error:', e);
    }
  },

  getObject: key => {
    try {
      const value = storage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error('Storage getObject error:', e);
      return null;
    }
  },

  clearAll: () => storage.clearAll(),
};
