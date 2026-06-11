// Fitness statistika ekrani
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api.service';

const FitnessScreen = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/fitness/stats');
        setStats(res.data.data.statistics);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 100 }} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📊 Fitness Statistika</Text>

        <Section title="Yugurish statistikasi">
          <StatCard icon="run" label="Jami masofa" value={`${((stats?.totalDistanceMeters || 0) / 1000).toFixed(2)} km`} color="#4CAF50" />
          <StatCard icon="clock" label="Jami vaqt" value={`${Math.floor((stats?.totalDurationSeconds || 0) / 60)} daqiqa`} color="#2196F3" />
          <StatCard icon="speedometer" label="O'rtacha tezlik" value={`${stats?.avgSpeedKmh?.toFixed(1) || '0.0'} km/h`} color="#FF9800" />
          <StatCard icon="trending-up" label="O'rtacha pace" value={formatPace(stats?.avgPaceSecondsPerKm)} color="#9C27B0" />
          <StatCard icon="fire" label="Jami kaloriya" value={`${Math.round(stats?.totalCalories || 0)} kcal`} color="#F44336" />
          <StatCard icon="counter" label="Jami yugurish" value={`${stats?.totalSessions || 0} marta`} color="#607D8B" />
        </Section>

        <Section title="Hudud statistikasi">
          <StatCard icon="map-marker-radius" label="Egallangan hududlar" value={`${stats?.territoriesCount || 0} ta`} color="#4CAF50" />
          <StatCard icon="eye" label="Ochilgan hujayralar" value={`${stats?.totalExploredCells || 0} ta`} color="#FF9800" />
          <StatCard icon="shield" label="Himoyalangan" value={`${stats?.territoriesDefended || 0} ta`} color="#2196F3" />
          <StatCard icon="sword-cross" label="Yo'qotilgan" value={`${stats?.territoriesLost || 0} ta`} color="#F44336" />
        </Section>
      </ScrollView>
    </LinearGradient>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.grid}>{children}</View>
  </View>
);

const StatCard = ({ icon, label, value, color }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={28} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const formatPace = secs => {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', backgroundColor: '#161B22', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#21262D',
  },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  statLabel: { color: '#6B7280', fontSize: 12, marginTop: 4, textAlign: 'center' },
});

export default FitnessScreen;
