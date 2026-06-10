// Bosh sahifa - dashboard
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api.service';
import { NIGHT_EVENT, XP_PER_LEVEL } from '../../constants';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { isRunning } = useSelector(state => state.running);
  const { unreadCount } = useSelector(state => state.notification);

  const [stats, setStats] = useState(null);
  const [isNightEvent, setIsNightEvent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/fitness/stats');
      setStats(response.data.data.statistics);
    } catch (e) {
      console.error('Stats yuklash xatosi:', e.message);
    }

    // Night event holati
    const hour = new Date().getHours();
    setIsNightEvent(hour >= NIGHT_EVENT.START_HOUR && hour < NIGHT_EVENT.END_HOUR);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  // XP progress bar
  const xpProgress = user ? (user.totalXP % XP_PER_LEVEL) / XP_PER_LEVEL : 0;

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Salom, {user?.username} 👋</Text>
            <Text style={styles.subGreeting}>Bugun ham yugurish vaqti!</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon name="bell" size={24} color="#9CA3AF" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Night Event banner */}
        {isNightEvent && (
          <LinearGradient colors={['#1a0a2e', '#2d1b69']} style={styles.nightEventBanner}>
            <Icon name="weather-night" size={24} color="#A78BFA" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.nightEventTitle}>🌙 Night Event Faol!</Text>
              <Text style={styles.nightEventText}>
                Territory ballari va XP 1.5x ko'paytiruvchida
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Foydalanuvchi darajasi */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{user?.level || 1}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Daraja {user?.level || 1}</Text>
              <Text style={styles.xpText}>
                {user?.totalXP % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
              </Text>
            </View>
          </View>
          {/* XP progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpProgress * 100}%` }]} />
          </View>
        </View>

        {/* Tezkor statistikalar */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              icon="map-marker-radius"
              title="Hudud"
              value={stats.territoriesCount || 0}
              unit="ta"
              color="#4CAF50"
            />
            <StatCard
              icon="run"
              title="Masofa"
              value={((stats.totalDistanceMeters || 0) / 1000).toFixed(1)}
              unit="km"
              color="#2196F3"
            />
            <StatCard
              icon="eye"
              title="Ochilgan"
              value={stats.totalExploredCells || 0}
              unit="hujayra"
              color="#FF9800"
            />
            <StatCard
              icon="fire"
              title="Kaloriya"
              value={Math.round(stats.totalCalories || 0)}
              unit="kcal"
              color="#F44336"
            />
          </View>
        )}

        {/* Tezkor harakatlar */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Harakatlar</Text>

          <TouchableOpacity
            style={styles.startRunButton}
            onPress={() => navigation.navigate('Running')}>
            <LinearGradient
              colors={isRunning ? ['#F44336', '#C62828'] : ['#4CAF50', '#388E3C']}
              style={styles.startRunGradient}>
              <Icon name={isRunning ? 'stop-circle' : 'run-fast'} size={28} color="#fff" />
              <Text style={styles.startRunText}>
                {isRunning ? '⚡ Yugurish davom etmoqda...' : '🏃 Yugurish boshlash'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <ActionButton
              icon="map"
              title="Xarita"
              onPress={() => navigation.navigate('Map')}
            />
            <ActionButton
              icon="chart-bar"
              title="Fitness"
              onPress={() => navigation.navigate('Fitness')}
            />
            <ActionButton
              icon="trophy"
              title="Reyting"
              onPress={() => navigation.navigate('Leaderboard')}
            />
            <ActionButton
              icon="cog"
              title="Sozlamalar"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

// Stat kartochkasi
const StatCard = ({ icon, title, value, unit, color }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statUnit}>{unit}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

// Harakatlar tugmasi
const ActionButton = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={styles.actionIcon}>
      <Icon name={icon} size={24} color="#4CAF50" />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#F9FAFB' },
  subGreeting: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  notifButton: { padding: 8, position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#F44336', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  nightEventBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#4C1D95',
  },
  nightEventTitle: { color: '#A78BFA', fontWeight: 'bold', fontSize: 15 },
  nightEventText: { color: '#C4B5FD', fontSize: 12, marginTop: 2 },
  levelCard: {
    backgroundColor: '#161B22', borderRadius: 16,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#21262D',
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
  },
  levelNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  levelInfo: { marginLeft: 12 },
  levelTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },
  xpText: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  progressBar: { height: 8, backgroundColor: '#21262D', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#161B22',
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#21262D',
  },
  statValue: { color: '#F9FAFB', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statUnit: { color: '#6B7280', fontSize: 12 },
  statTitle: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  actionsSection: {},
  sectionTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  startRunButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  startRunGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 20, gap: 12,
  },
  startRunText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { alignItems: 'center', flex: 1 },
  actionIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  actionTitle: { color: '#9CA3AF', fontSize: 12 },
});

export default HomeScreen;
