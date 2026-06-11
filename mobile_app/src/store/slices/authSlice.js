import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import api from '../../services/api.service';
import { storage, StorageUtils } from '../../utils/storage';
import { STORAGE_KEYS } from '../../constants';
import { socketService } from '../../services/socket.service';

// Login — backend faqat `email` qabul qiladi
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ emailOrUsername, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email: emailOrUsername, password });
      return response.data.data;
    } catch (error) {
      console.error('[LOGIN ERROR]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Login xatosi yuz berdi'
      );
    }
  }
);

// Register — backend `displayName` va `devicePlatform` kutadi
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        displayName: userData.fullName || userData.displayName || userData.username,
        region: userData.region,
        devicePlatform: Platform.OS, // 'ios' | 'android' — backend lowercase kutadi
      };
      console.log('[REGISTER] Sending:', JSON.stringify(payload));
      const response = await api.post('/auth/register', payload);
      return response.data.data;
    } catch (error) {
      console.error('[REGISTER ERROR]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      return rejectWithValue(
        error.response?.data?.message || error.message || "Ro'yxatdan o'tish xatosi"
      );
    }
  }
);

// Device token yangilash — iOS uchun apnsToken, Android uchun fcmToken
export const updateDeviceToken = createAsyncThunk(
  'auth/updateDeviceToken',
  async ({ fcmToken, platform }, { rejectWithValue }) => {
    try {
      const payload = {
        fcmToken: Platform.OS === 'android' ? fcmToken : undefined,
        apnsToken: Platform.OS === 'ios' ? fcmToken : undefined,
      };
      await api.put('/auth/device-token', payload);
      return { fcmToken };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = storage.getString(STORAGE_KEYS.REFRESH_TOKEN);
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout server xatosi:', error.message);
    } finally {
      StorageUtils.clearAll();
      socketService.disconnect();
    }
  }
);

// Session tiklash — /auth/me dan user ma'lumotlarini oladi
export const restoreUser = createAsyncThunk(
  'auth/restore',
  async (_, { rejectWithValue }) => {
    try {
      const token = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = StorageUtils.getObject(STORAGE_KEYS.USER_DATA);

      if (!token || !userData) {
        return rejectWithValue('Token topilmadi');
      }

      const response = await api.get('/auth/me');
      // Backend { success, data: { user } } qaytaradi
      const user = response.data.data?.user || response.data.data;
      return { user, accessToken: token };
    } catch (error) {
      StorageUtils.clearAll();
      return rejectWithValue('Session muddati tugagan');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    isRestoring: true,
    error: null,
  },
  reducers: {
    setTokens: (state, action) => {
      const { accessToken } = action.payload;
      state.accessToken = accessToken;
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    },
    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      StorageUtils.setObject(STORAGE_KEYS.USER_DATA, state.user);
    },
    updateXP: (state, action) => {
      if (state.user) {
        state.user.totalXP = action.payload.totalXP;
        state.user.level = action.payload.level;
      }
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
        StorageUtils.setObject(STORAGE_KEYS.USER_DATA, action.payload.user);
        socketService.connect();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(registerUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
        StorageUtils.setObject(STORAGE_KEYS.USER_DATA, action.payload.user);
        socketService.connect();
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder.addCase(logoutUser.fulfilled, state => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    builder
      .addCase(restoreUser.pending, state => {
        state.isRestoring = true;
      })
      .addCase(restoreUser.fulfilled, (state, action) => {
        state.isRestoring = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        socketService.connect();
      })
      .addCase(restoreUser.rejected, state => {
        state.isRestoring = false;
        state.isAuthenticated = false;
      });
  },
});

export const { setTokens, updateUserData, updateXP, clearError } = authSlice.actions;
export default authSlice.reducer;
