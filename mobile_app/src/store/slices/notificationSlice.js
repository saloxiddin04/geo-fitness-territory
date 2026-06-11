// Notification Redux slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.service';

export const fetchNotifications = createAsyncThunk(
  'notification/fetch',
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      // Backend { notifications, total, page, limit } qaytaradi — unreadCount yo'q
      // Shuning uchun unread-count ni alohida so'raymiz
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications', { params: { page, limit } }),
        page === 1 ? api.get('/notifications/unread-count') : Promise.resolve(null),
      ]);
      const unreadCount = countRes?.data?.data?.count ?? 0;
      return { ...notifRes.data.data, unreadCount, page };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/notifications/read-all');
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    items: [],
    unreadCount: 0,
    total: 0,
    hasMore: true,
    isLoading: false,
    error: null,
  },
  reducers: {
    // Socket orqali kelgan yangi notification
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNotifications.pending, state => { state.isLoading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        const { notifications, total, unreadCount, page } = action.payload;

        if (page === 1) {
          state.items = notifications;
        } else {
          state.items = [...state.items, ...notifications];
        }

        state.total = total;
        state.unreadCount = unreadCount;
        state.hasMore = state.items.length < total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const id = action.payload;
      const notification = state.items.find(n => n.id === id);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    builder.addCase(markAllAsRead.fulfilled, state => {
      state.items.forEach(n => { n.isRead = true; });
      state.unreadCount = 0;
    });
  },
});

export const { addNotification, setUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;
