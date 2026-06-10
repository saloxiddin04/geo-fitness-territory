// Leaderboard Redux slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';

export const fetchGlobalLeaderboard = createAsyncThunk(
  'leaderboard/fetchGlobal',
  async ({ category = 'territory', limit = 50 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/leaderboard/global', {
        params: { category, limit },
      });
      return { data: response.data.data, category };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchRegionalLeaderboard = createAsyncThunk(
  'leaderboard/fetchRegional',
  async ({ region, category = 'territory', limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/leaderboard/regional/${region}`, {
        params: { category, limit },
      });
      return { data: response.data.data, region, category };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const fetchMyRank = createAsyncThunk(
  'leaderboard/myRank',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/leaderboard/my-rank');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState: {
    global: {},        // { territory: [...], distance: [...], ... }
    regional: {},      // { tashkent: { territory: [...], ... }, ... }
    myRanks: null,
    activeCategory: 'territory',
    isLoading: false,
    error: null,
  },
  reducers: {
    setActiveCategory: (state, action) => {
      state.activeCategory = action.payload;
    },
    // Real-time leaderboard yangilash
    updateFromSocket: (state, action) => {
      const { category, entries } = action.payload;
      state.global[category] = entries;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchGlobalLeaderboard.pending, state => { state.isLoading = true; })
      .addCase(fetchGlobalLeaderboard.fulfilled, (state, action) => {
        state.isLoading = false;
        const { data, category } = action.payload;
        state.global[category] = data.leaderboard;
      })
      .addCase(fetchGlobalLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder.addCase(fetchRegionalLeaderboard.fulfilled, (state, action) => {
      const { data, region, category } = action.payload;
      if (!state.regional[region]) state.regional[region] = {};
      state.regional[region][category] = data.leaderboard;
    });

    builder.addCase(fetchMyRank.fulfilled, (state, action) => {
      state.myRanks = action.payload;
    });
  },
});

export const { setActiveCategory, updateFromSocket } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
