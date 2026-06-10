// Redux store - barcha slice'larni birlashtirish
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import territoryReducer from './slices/territorySlice';
import runningReducer from './slices/runningSlice';
import notificationReducer from './slices/notificationSlice';
import leaderboardReducer from './slices/leaderboardSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    territory: territoryReducer,
    running: runningReducer,
    notification: notificationReducer,
    leaderboard: leaderboardReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // Serializable bo'lmagan qiymatlarni o'tkazib yuborish (Date, Function)
      serializableCheck: {
        ignoredActions: ['running/updateLocation'],
        ignoredPaths: ['running.gpsPoints'],
      },
    }),
  devTools: __DEV__,
});

export default store;
