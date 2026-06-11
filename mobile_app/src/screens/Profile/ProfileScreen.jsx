// Profil ekrani
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logoutUser } from '../../store/slices/authSlice';
import api from '../../services/api.service';
import { UZBEKISTAN_REGIONS, XP_PER_LEVEL } from '../../constants';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/fitness/stats');
        // Backend flat structure: { success, data: { totalDistanceMeters, ... } }
        setStats(res.data.data);
      } catch (e) {}
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Rostdan ham chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish', style: 'destructive',
        onPress: () => dispatch(logoutUser()),
      },
    ]);
  };

  const regionName = UZBEKISTAN_REGIONS.find(r => r.id === user?.region)?.name || user?.region;
  const xpProgress = user ? (user.totalXP % XP_PER_LEVEL) / XP_PER_LEVEL : 0;

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar va asosiy ma'lumot */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.username || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.fullName}>{user?.fullName}</Text>
          <View style={styles.regionBadge}>
            <Icon name="map-marker" size={14} color="#6B7280" />
            <Text style={styles.regionText}>{regionName}</Text>
          </View>
        </View>

        {/* Level progressi */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Daraja {user?.level || 1}</Text>
            <Text style={styles.xpText}>
              {user?.totalXP || 0} / {(user?.level || 1) * XP_PER_LEVEL} XP
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpProgress * 100}%` }]} />
          </View>
          <Text style={styles.nextLevel}>
            Keyingi darajaga: {XP_PER_LEVEL - ((user?.totalXP || 0) % XP_PER_LEVEL)} XP
          </Text>
        </View>

        {/* Statistikalar */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Statistika</Text>
            <StatRow icon="map-marker-radius" label="Egallangan hududlar" value={`${stats.territoriesCount || 0} ta`} />
            <StatRow icon="eye" label="Ochilgan hujayralar" value={`${stats.totalExploredCells || 0} ta`} />
            <StatRow icon="run" label="Jami masofa" value={`${((stats.totalDistanceMeters || 0) / 1000).toFixed(1)} km`} />
            <StatRow icon="fire" label="Jami kaloriya" value={`${Math.round(stats.totalCalories || 0)} kcal`} />
            <StatRow icon="shield" label="Himoyalangan" value={`${stats.territoriesDefended || 0} ta`} />
            <StatRow icon="sword-cross" label="Yo'qotilgan" value={`${stats.territoriesLost || 0} ta`} />
          </View>
        )}

        {/* Harakatlar */}
        <View style={styles.actionsCard}>
          <ActionItem icon="chart-bar" label="Fitness statistikasi" onPress={() => navigation.navigate('Fitness')} />
          <ActionItem icon="bell" label="Bildirishnomalar" onPress={() => navigation.navigate('Notifications')} />
          <ActionItem icon="cog" label="Sozlamalar" onPress={() => navigation.navigate('Settings')} />
          <ActionItem icon="exit-to-app" label="Chiqish" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const StatRow = ({ icon, label, value }) => (
  <View style={styles.statRow}>
    <Icon name={icon} size={18} color="#4CAF50" />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ActionItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <Icon name={icon} size={20} color={danger ? '#EF4444' : '#4CAF50'} />
    <Text style={[styles.actionLabel, danger && styles.dangerText]}>{label}</Text>
    <Icon name="chevron-right" size={18} color="#6B7280" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: '#388E3C',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  username: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
  fullName: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  regionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: '#161B22', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  regionText: { color: '#6B7280', fontSize: 12 },
  levelCard: {
    backgroundColor: '#161B22', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#21262D',
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  levelText: { color: '#F9FAFB', fontWeight: '600' },
  xpText: { color: '#6B7280', fontSize: 13 },
  progressBar: { height: 8, backgroundColor: '#21262D', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  nextLevel: { color: '#6B7280', fontSize: 11, textAlign: 'right' },
  statsCard: {
    backgroundColor: '#161B22', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#21262D',
  },
  sectionTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  statLabel: { color: '#9CA3AF', flex: 1, fontSize: 14 },
  statValue: { color: '#F9FAFB', fontWeight: '600' },
  actionsCard: {
    backgroundColor: '#161B22', borderRadius: 12,
    borderWidth: 1, borderColor: '#21262D', overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#21262D',
  },
  actionLabel: { color: '#F9FAFB', flex: 1, fontSize: 15 },
  dangerText: { color: '#EF4444' },
});

export default ProfileScreen;
