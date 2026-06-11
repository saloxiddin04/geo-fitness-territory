// Territory Redux slice - hudud holati boshqaruvi
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';

// Yaqin atrofdagi hududlarni yuklash
export const fetchNearbyTerritories = createAsyncThunk(
  'territory/fetchNearby',
  async ({ lat, lng, radius = 2 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/territories/nearby', {
        params: { lat, lng, radius },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// Foydalanuvchi ochgan hududlarni yuklash (Fog of War)
export const fetchExploredCells = createAsyncThunk(
  'territory/fetchExplored',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/territories/explored');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const territorySlice = createSlice({
  name: 'territory',
  initialState: {
    // Yaqin atrofdagi hududlar ro'yxati
    nearbyTerritories: [],
    // Foydalanuvchi ochgan barcha H3 celllar
    exploredCells: [],
    // Xaritada ko'rsatish uchun yuklangan hududlar (h3Index key)
    territoriesMap: {},
    isLoading: false,
    isLoadingExplored: false,
    lastFetchedAt: null,
    error: null,
  },
  reducers: {
    // Real-time: hujum bo'lganda hududni yangilash
    updateTerritoryFromSocket: (state, action) => {
      const { h3Index, ownerId, ownerUsername, defenseLevel, isOwn } = action.payload;
      state.territoriesMap[h3Index] = {
        ...state.territoriesMap[h3Index],
        ownerId,
        ownerUsername,
        defenseLevel,
        isOwn,
        updatedAt: new Date().toISOString(),
      };

      // nearbyTerritories ham yangilash
      const idx = state.nearbyTerritories.findIndex(t => t.h3Index === h3Index);
      if (idx !== -1) {
        state.nearbyTerritories[idx] = {
          ...state.nearbyTerritories[idx],
          ownerId,
          ownerUsername,
          defenseLevel,
          isOwn,
        };
      }
    },

    // Yangi ochilgan hududni qo'shish
    addExploredCell: (state, action) => {
      const { h3Index } = action.payload;
      if (!state.exploredCells.includes(h3Index)) {
        state.exploredCells.push(h3Index);
      }
    },

    // Yangi egallangan hududni qo'shish
    addCapturedTerritory: (state, action) => {
      const territory = action.payload;
      state.territoriesMap[territory.h3Index] = territory;
      state.nearbyTerritories.push(territory);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNearbyTerritories.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchNearbyTerritories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearbyTerritories = action.payload.territories;
        state.lastFetchedAt = Date.now();

        // Map ga ham saqlash (tez qidirish uchun)
        action.payload.territories.forEach(t => {
          state.territoriesMap[t.h3Index] = t;
        });
      })
      .addCase(fetchNearbyTerritories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchExploredCells.pending, state => {
        state.isLoadingExplored = true;
      })
      .addCase(fetchExploredCells.fulfilled, (state, action) => {
        state.isLoadingExplored = false;
        // Backend returns { cells: [...] }
        state.exploredCells = action.payload.cells || action.payload.exploredCells || [];
      })
      .addCase(fetchExploredCells.rejected, state => {
        state.isLoadingExplored = false;
      });
  },
});

export const { updateTerritoryFromSocket, addExploredCell, addCapturedTerritory } =
  territorySlice.actions;

export default territorySlice.reducer;
