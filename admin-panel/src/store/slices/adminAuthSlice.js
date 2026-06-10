// Admin Auth slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';

export const adminLogin = createAsyncThunk(
  'adminAuth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/auth/login', { email, password });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login xatosi');
    }
  }
);

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    admin: JSON.parse(localStorage.getItem('admin_data') || 'null'),
    token: localStorage.getItem('admin_token'),
    isAuthenticated: !!localStorage.getItem('admin_token'),
    isLoading: false,
    error: null,
  },
  reducers: {
    logout: state => {
      state.admin = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
    },
    clearError: state => { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(adminLogin.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.admin = action.payload.admin;
        state.token = action.payload.token;
        localStorage.setItem('admin_token', action.payload.token);
        localStorage.setItem('admin_data', JSON.stringify(action.payload.admin));
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
