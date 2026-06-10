// Asosiy App komponenti - FCM setup va Provider'lar
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { socketService } from './src/services/socket.service';
import { STORAGE_KEYS, SOCKET_EVENTS } from './src/constants';
import { storage } from './src/utils/storage';
import { updateDeviceToken } from './src/store/slices/authSlice';
import {
  addNotification,
  setUnreadCount,
} from './src/store/slices/notificationSlice';
import {
  updateTerritoryFromSocket,
} from './src/store/slices/territorySlice';
import { updateFromSocket as updateLeaderboard } from './src/store/slices/leaderboardSlice';

// FCM sozlamalari
const setupFCM = async () => {
  try {
    // Ruxsat so'rash
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    // FCM token olish
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
      // Serverga yuborish (auth bo'lsa)
      const accessToken = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
      if (accessToken) {
        store.dispatch(
          updateDeviceToken({ fcmToken, platform: Platform.OS })
        );
      }
    }

    // Fon notificationlarni tinglash
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('FCM background message:', remoteMessage.notification?.title);
    });

    // Ilova ochiq bo'lganda notification
    messaging().onMessage(async remoteMessage => {
      store.dispatch(
        addNotification({
          id: Date.now().toString(),
          title: remoteMessage.notification?.title || 'Yangi xabar',
          body: remoteMessage.notification?.body || '',
          type: remoteMessage.data?.type || 'BROADCAST',
          isRead: false,
          createdAt: new Date().toISOString(),
        })
      );
    });
  } catch (error) {
    console.error('FCM setup xatosi:', error.message);
  }
};

// Socket event'larini Redux ga ulash
const connectSocketToRedux = () => {
  // Hujum bildirishmasi
  socketService.on(SOCKET_EVENTS.TERRITORY_ATTACKED, data => {
    store.dispatch(
      addNotification({
        id: Date.now().toString(),
        title: '⚔️ Hududingizga hujum!',
        body: `${data.attackerUsername} hududingizga hujum qildi!`,
        type: 'TERRITORY_ATTACK',
        isRead: false,
        createdAt: new Date().toISOString(),
      })
    );
    store.dispatch(updateTerritoryFromSocket(data));
  });

  // Hudud egallandi
  socketService.on(SOCKET_EVENTS.TERRITORY_CAPTURED, data => {
    store.dispatch(updateTerritoryFromSocket(data));
  });

  // Night event boshlandi
  socketService.on(SOCKET_EVENTS.NIGHT_EVENT_START, data => {
    store.dispatch(
      addNotification({
        id: Date.now().toString(),
        title: '🌙 Night Event boshlandi!',
        body: `Barcha balllar ${data.multiplier}x ko'paytirildi!`,
        type: 'NIGHT_EVENT_START',
        isRead: false,
        createdAt: new Date().toISOString(),
      })
    );
  });

  // Leaderboard yangilandi
  socketService.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, data => {
    store.dispatch(updateLeaderboard(data));
  });
};

const App = () => {
  useEffect(() => {
    setupFCM();
    connectSocketToRedux();
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;
