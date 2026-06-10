// Running Session Redux slice - yugurish sessiyasi holati
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';

// Yugurish sessiyasini boshlash
export const startSession = createAsyncThunk(
  'running/start',
  async ({ latitude, longitude }, { rejectWithValue }) => {
    try {
      const response = await api.post('/running/start', { latitude, longitude });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Sessiya boshlanmadi');
    }
  }
);

// GPS nuqtalarini serverga yuborish
export const sendGpsPoints = createAsyncThunk(
  'running/sendPoints',
  async ({ sessionId, points }, { rejectWithValue }) => {
    try {
      const response = await api.post('/running/points', { sessionId, points });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// Yugurish sessiyasini tugatish
export const endSession = createAsyncThunk(
  'running/end',
  async ({ sessionId }, { rejectWithValue }) => {
    try {
      const response = await api.post('/running/end', { sessionId });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Sessiya tugmadi');
    }
  }
);

// Yugurish tarixini yuklash
export const fetchRunningHistory = createAsyncThunk(
  'running/fetchHistory',
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/running/history', { params: { page, limit } });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const runningSlice = createSlice({
  name: 'running',
  initialState: {
    // Faol sessiya ma'lumotlari
    activeSession: null,
    isRunning: false,

    // Real-time metrikalar (GPS dan hisoblanadi)
    currentLocation: null,
    gpsPoints: [],
    distance: 0,       // metrda
    duration: 0,       // sekundda
    avgSpeed: 0,       // km/h
    currentSpeed: 0,   // km/h
    calories: 0,
    pace: 0,           // min/km

    // Timer
    startTime: null,

    // Pugurish tarixi
    history: [],
    historyPage: 1,
    historyTotal: 0,
    hasMoreHistory: true,

    isLoading: false,
    isSendingPoints: false,
    error: null,
  },
  reducers: {
    // GPS pozitsiyasini yangilash (background geolocation dan keladi)
    updateLocation: (state, action) => {
      const { latitude, longitude, speed, timestamp } = action.payload;
      state.currentLocation = { latitude, longitude, timestamp };
      state.currentSpeed = speed > 0 ? (speed * 3.6).toFixed(1) : 0; // m/s -> km/h

      // GPS nuqtasini local state ga qo'shish
      if (state.isRunning) {
        state.gpsPoints.push({ latitude, longitude, timestamp });
      }
    },

    // Timer yangilash (har sekund)
    updateDuration: state => {
      if (state.startTime) {
        state.duration = Math.floor((Date.now() - state.startTime) / 1000);
      }
    },

    // Masofa va metrikalarni yangilash
    updateMetrics: (state, action) => {
      const { distance, avgSpeed, calories, pace } = action.payload;
      if (distance !== undefined) state.distance = distance;
      if (avgSpeed !== undefined) state.avgSpeed = avgSpeed;
      if (calories !== undefined) state.calories = calories;
      if (pace !== undefined) state.pace = pace;
    },

    // Sessiya metrikalarini tozalash
    resetSession: state => {
      state.activeSession = null;
      state.isRunning = false;
      state.currentLocation = null;
      state.gpsPoints = [];
      state.distance = 0;
      state.duration = 0;
      state.avgSpeed = 0;
      state.currentSpeed = 0;
      state.calories = 0;
      state.pace = 0;
      state.startTime = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Sessiya boshlash
    builder
      .addCase(startSession.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRunning = true;
        state.activeSession = action.payload.session;
        state.startTime = Date.now();
        state.gpsPoints = [];
        state.distance = 0;
        state.duration = 0;
      })
      .addCase(startSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // GPS nuqtalarini yuborish
    builder
      .addCase(sendGpsPoints.pending, state => {
        state.isSendingPoints = true;
      })
      .addCase(sendGpsPoints.fulfilled, state => {
        state.isSendingPoints = false;
      })
      .addCase(sendGpsPoints.rejected, state => {
        state.isSendingPoints = false;
        // Xato bo'lsa ham davom etamiz (offline qo'llab-quvvatlash keyinroq)
      });

    // Sessiyani tugatish
    builder
      .addCase(endSession.pending, state => {
        state.isLoading = true;
      })
      .addCase(endSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRunning = false;
        // Natijalarni saqlash (yakuniy ekranda ko'rsatish uchun)
        state.lastSessionResult = action.payload.session;
        state.activeSession = null;
        state.startTime = null;
      })
      .addCase(endSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Tarixni yuklash
    builder
      .addCase(fetchRunningHistory.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchRunningHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        const { sessions, total, page } = action.payload;

        if (page === 1) {
          state.history = sessions;
        } else {
          state.history = [...state.history, ...sessions];
        }

        state.historyPage = page;
        state.historyTotal = total;
        state.hasMoreHistory = state.history.length < total;
      })
      .addCase(fetchRunningHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { updateLocation, updateDuration, updateMetrics, resetSession } =
  runningSlice.actions;

export default runningSlice.reducer;
