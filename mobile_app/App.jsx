import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { socketService } from './src/services/socket.service';
import { STORAGE_KEYS, SOCKET_EVENTS } from './src/constants';
import { storage } from './src/utils/storage';
import { updateDeviceToken } from './src/store/slices/authSlice';
import { addNotification } from './src/store/slices/notificationSlice';
import { updateTerritoryFromSocket } from './src/store/slices/territorySlice';
import { updateFromSocket as updateLeaderboard } from './src/store/slices/leaderboardSlice';

const setupFCM = async () => {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === 1 || authStatus === 2;
    if (!enabled) return;

    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      const accessToken = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
      if (accessToken) {
        store.dispatch(updateDeviceToken({ fcmToken, platform: Platform.OS }));
      }
    }

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('FCM background message:', remoteMessage.notification?.title);
    });

    messaging().onMessage(async remoteMessage => {
      store.dispatch(addNotification({
        id: Date.now().toString(),
        title: remoteMessage.notification?.title || 'Yangi xabar',
        body: remoteMessage.notification?.body || '',
        type: remoteMessage.data?.type || 'BROADCAST',
        isRead: false,
        createdAt: new Date().toISOString(),
      }));
    });
  } catch (error) {
    console.warn('FCM setup: Firebase sozlash talab etiladi.', error.message);
  }
};

const connectSocketToRedux = () => {
  socketService.on(SOCKET_EVENTS.TERRITORY_ATTACKED, data => {
    store.dispatch(addNotification({
      id: Date.now().toString(),
      title: '⚔️ Hududingizga hujum!',
      body: `${data.attackerUsername} hududingizga hujum qildi!`,
      type: 'TERRITORY_ATTACK',
      isRead: false,
      createdAt: new Date().toISOString(),
    }));
    store.dispatch(updateTerritoryFromSocket(data));
  });

  socketService.on(SOCKET_EVENTS.TERRITORY_CAPTURED, data => {
    store.dispatch(updateTerritoryFromSocket(data));
  });

  socketService.on(SOCKET_EVENTS.NIGHT_EVENT_START, data => {
    store.dispatch(addNotification({
      id: Date.now().toString(),
      title: '🌙 Night Event boshlandi!',
      body: `Barcha balllar ${data.multiplier}x ko'paytirildi!`,
      type: 'NIGHT_EVENT_START',
      isRead: false,
      createdAt: new Date().toISOString(),
    }));
  });

  socketService.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, data => {
    store.dispatch(updateLeaderboard(data));
  });
};

const App = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // AsyncStorage dan cache yuklanmaguncha AppNavigator ko'rsatilmaydi
    storage.hydrate().then(() => {
      setHydrated(true);
      setupFCM();
      connectSocketToRedux();
    });
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
