// Bildirishnomalar ekrani
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/uz';
import {
  fetchNotifications, markAsRead, markAllAsRead,
} from '../../store/slices/notificationSlice';

dayjs.extend(relativeTime);
dayjs.locale('uz');

const NOTIFICATION_ICONS = {
  TERRITORY_ATTACK: { icon: 'sword-cross', color: '#F44336' },
  TERRITORY_CAPTURED: { icon: 'map-marker-check', color: '#4CAF50' },
  TERRITORY_DEFENDED: { icon: 'shield-check', color: '#2196F3' },
  NIGHT_EVENT_START: { icon: 'weather-night', color: '#A78BFA' },
  LEVEL_UP: { icon: 'arrow-up-circle', color: '#FFD700' },
  WEEKLY_STATS: { icon: 'chart-bar', color: '#FF9800' },
  BROADCAST: { icon: 'bullhorn', color: '#9CA3AF' },
};

const NotificationsScreen = () => {
  const dispatch = useDispatch();
  const { items, isLoading, hasMore, unreadCount } = useSelector(
    state => state.notification
  );

  useEffect(() => {
    dispatch(fetchNotifications({ page: 1 }));
  }, [dispatch]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = Math.ceil(items.length / 20) + 1;
      dispatch(fetchNotifications({ page: nextPage }));
    }
  };

  const renderItem = ({ item }) => {
    const typeConfig = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.BROADCAST;

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.unreadItem]}
        onPress={() => !item.isRead && dispatch(markAsRead(item.id))}>

        <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.color}20` }]}>
          <Icon name={typeConfig.icon} size={22} color={typeConfig.color} />
        </View>

        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{dayjs(item.createdAt).fromNow()}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Bildirishnomalar</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => dispatch(markAllAsRead())}>
            <Text style={styles.markAllText}>Barchasini o'qildi</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoading ? <ActivityIndicator size="small" color="#4CAF50" style={{ padding: 16 }} /> : null
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyState}>
              <Icon name="bell-off" size={48} color="#374151" />
              <Text style={styles.emptyText}>Bildirishnomalar yo'q</Text>
            </View>
          )
        }
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold' },
  markAllText: { color: '#4CAF50', fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#161B22', borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: '#21262D',
  },
  unreadItem: { borderColor: '#2d4a1a', backgroundColor: '#0f1f0a' },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitle: { color: '#F9FAFB', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  notifBody: { color: '#9CA3AF', fontSize: 13, lineHeight: 18 },
  notifTime: { color: '#4B5563', fontSize: 11, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4CAF50', marginTop: 4,
  },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#6B7280', fontSize: 16 },
});

export default NotificationsScreen;
