// Yugurish natijasi ekrani
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { resetSession } from '../../store/slices/runningSlice';

const RunningResultScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { lastSessionResult } = useSelector(state => state.running);
  const session = lastSessionResult;

  const handleDone = () => {
    dispatch(resetSession());
    navigation.navigate('Home');
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>Ma'lumot topilmadi</Text>
        <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Bosh sahifaga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const distanceKm = (session.distanceMeters / 1000).toFixed(2);
  const durationMin = Math.floor(session.durationSeconds / 60);
  const territoriesCaptured = session.stats?.territoriesCaptured || 0;
  const cellsExplored = session.stats?.cellsExplored || 0;
  const xpEarned = session.stats?.xpEarned || 0;

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Muvaffaqiyat animatsiyasi */}
        <View style={styles.successIcon}>
          <Icon name="check-circle" size={80} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Yugurish yakunlandi! 🎉</Text>
        <Text style={styles.subtitle}>Ajoyib ish!</Text>

        {/* Asosiy natijalar */}
        <View style={styles.mainStats}>
          <StatBlock value={`${distanceKm} km`} label="Masofa" icon="run" color="#4CAF50" />
          <StatBlock value={`${durationMin} daq`} label="Vaqt" icon="clock" color="#2196F3" />
          <StatBlock
            value={`${session.avgSpeedKmh?.toFixed(1) || 0} km/h`}
            label="O'rtacha tezlik"
            icon="speedometer"
            color="#FF9800"
          />
        </View>

        {/* O'yin natijalari */}
        <View style={styles.gameStats}>
          <Text style={styles.sectionTitle}>O'yin natijalari</Text>

          <View style={styles.gameRow}>
            <Icon name="map-marker-radius" size={20} color="#4CAF50" />
            <Text style={styles.gameLabel}>Egallangan hududlar</Text>
            <Text style={styles.gameValue}>{territoriesCaptured}</Text>
          </View>

          <View style={styles.gameRow}>
            <Icon name="eye" size={20} color="#FF9800" />
            <Text style={styles.gameLabel}>Ochilgan hujayralar</Text>
            <Text style={styles.gameValue}>{cellsExplored}</Text>
          </View>

          <View style={styles.gameRow}>
            <Icon name="fire" size={20} color="#F44336" />
            <Text style={styles.gameLabel}>Yoqilgan kaloriya</Text>
            <Text style={styles.gameValue}>{Math.round(session.calories || 0)} kcal</Text>
          </View>

          {/* XP badge */}
          <LinearGradient colors={['#1a3a1a', '#0a2a0a']} style={styles.xpBadge}>
            <Icon name="star" size={24} color="#FFD700" />
            <Text style={styles.xpText}>+{xpEarned} XP olindi!</Text>
          </LinearGradient>
        </View>

        {/* Tugatish tugmasi */}
        <TouchableOpacity onPress={handleDone}>
          <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Bajarildi!</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const StatBlock = ({ value, label, icon, color }) => (
  <View style={styles.statBlock}>
    <Icon name={icon} size={24} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60, alignItems: 'center' },
  noData: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginTop: 100 },
  successIcon: { marginBottom: 16 },
  title: { color: '#F9FAFB', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#6B7280', fontSize: 16, marginTop: 4, marginBottom: 32 },
  mainStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBlock: {
    flex: 1, backgroundColor: '#161B22', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#21262D',
  },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#6B7280', fontSize: 12, marginTop: 4, textAlign: 'center' },
  gameStats: {
    width: '100%', backgroundColor: '#161B22', borderRadius: 16,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#21262D',
  },
  sectionTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  gameRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10,
  },
  gameLabel: { color: '#9CA3AF', fontSize: 14, flex: 1 },
  gameValue: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, padding: 12, marginTop: 8, gap: 8,
    borderWidth: 1, borderColor: '#2a5a2a',
  },
  xpText: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  doneButton: {
    width: '100%', borderRadius: 16, overflow: 'hidden',
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default RunningResultScreen;
