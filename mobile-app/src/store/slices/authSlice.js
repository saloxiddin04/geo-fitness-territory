// Auth Redux slice - foydalanuvchi autentifikatsiyasi holati
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';
import { storage, StorageUtils } from '../../utils/storage';
import { STORAGE_KEYS } from '../../constants';
import { socketService } from '../../services/socket.service';

// Login action
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ emailOrUsername, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { emailOrUsername, password });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Login xatosi yuz berdi"
      );
    }
  }
);

// Register action
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Ro'yxatdan o'tish xatosi"
      );
    }
  }
);

// FCM token yangilash
export const updateDeviceToken = createAsyncThunk(
  'auth/updateDeviceToken',
  async ({ fcmToken, platform }, { rejectWithValue }) => {
    try {
      await api.put('/auth/device-token', { fcmToken, platform });
      return { fcmToken };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// Logout action
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = storage.getString(STORAGE_KEYS.REFRESH_TOKEN);
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      // Serverda xato bo'lsa ham local'da tozalaymiz
      console.error('Logout server xatosi:', error.message);
    } finally {
      // Local ma'lumotlarni tozalash
      StorageUtils.clearAll();
      socketService.disconnect();
    }
  }
);

// Saqlangan tokendan foydalanuvchini tiklash
export const restoreUser = createAsyncThunk(
  'auth/restore',
  async (_, { rejectWithValue }) => {
    try {
      const token = storage.getString(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = StorageUtils.getObject(STORAGE_KEYS.USER_DATA);

      if (!token || !userData) {
        return rejectWithValue('Token topilmadi');
      }

      // Token hali ham ishlashini tekshirish
      const response = await api.get('/auth/me');
      return { user: response.data.data, accessToken: token };
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
    // Token refresh dan keyin yangi token saqlash
    setTokens: (state, action) => {
      const { accessToken } = action.payload;
      state.accessToken = accessToken;
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    },
    // Profil yangilanishi
    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      StorageUtils.setObject(STORAGE_KEYS.USER_DATA, state.user);
    },
    // XP va level yangilash
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
    // Login
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

        // Tokenlarni saqlash
        storage.set(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
        StorageUtils.setObject(STORAGE_KEYS.USER_DATA, action.payload.user);

        // Socket ulanish
        socketService.connect();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Register
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

    // Logout
    builder.addCase(logoutUser.fulfilled, state => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Restore session
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
