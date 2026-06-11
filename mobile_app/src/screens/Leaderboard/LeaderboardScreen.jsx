// Leaderboard ekrani
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchGlobalLeaderboard, fetchMyRank, setActiveCategory,
} from '../../store/slices/leaderboardSlice';
import { UZBEKISTAN_REGIONS } from '../../constants';

const CATEGORIES = [
  { id: 'territory', label: 'Hudud', icon: 'map-marker-radius' },
  { id: 'distance', label: 'Masofa', icon: 'run' },
  { id: 'explored', label: 'Kashfiyot', icon: 'eye' },
  { id: 'xp', label: 'XP', icon: 'star' },
];

const LeaderboardScreen = () => {
  const dispatch = useDispatch();
  const { global, activeCategory, myRanks, isLoading } = useSelector(
    state => state.leaderboard
  );
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchGlobalLeaderboard({ category: activeCategory }));
    dispatch(fetchMyRank());
  }, [dispatch, activeCategory]);

  const entries = global[activeCategory] || [];

  const getRankIcon = rank => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getValueForCategory = (entry, category) => {
    switch (category) {
      case 'territory': return `${entry.territoriesCount} hudud`;
      case 'distance': return `${((entry.totalDistanceMeters || 0) / 1000).toFixed(1)} km`;
      case 'explored': return `${entry.totalExploredCells || 0} hujayra`;
      case 'xp': return `${entry.totalXP || 0} XP`;
      default: return '';
    }
  };

  const renderItem = ({ item, index }) => {
    const rank = index + 1;
    const isMe = item.userId === user?.id;

    return (
      <View style={[styles.entryCard, isMe && styles.myEntry]}>
        <Text style={[styles.rank, rank <= 3 && styles.topRank]}>
          {getRankIcon(rank)}
        </Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.username}>
            {item.username} {isMe ? '(Sen)' : ''}
          </Text>
          <Text style={styles.level}>Daraja {item.level}</Text>
        </View>
        <Text style={styles.value}>{getValueForCategory(item, activeCategory)}</Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      {/* Sarlavha */}
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Reyting</Text>
      </View>

      {/* Mening reytingim */}
      {myRanks && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankTitle}>Mening o'rnim</Text>
          <View style={styles.myRankRow}>
            {CATEGORIES.map(cat => (
              <View key={cat.id} style={styles.myRankItem}>
                <Icon name={cat.icon} size={16} color="#4CAF50" />
                <Text style={styles.myRankValue}>
                  #{myRanks[cat.id] || '--'}
                </Text>
                <Text style={styles.myRankLabel}>{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Kategoriya filtrlari */}
      <View style={styles.categories}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryTab, activeCategory === cat.id && styles.categoryTabActive]}
            onPress={() => dispatch(setActiveCategory(cat.id))}>
            <Icon
              name={cat.icon}
              size={16}
              color={activeCategory === cat.id ? '#4CAF50' : '#6B7280'}
            />
            <Text style={[
              styles.categoryText,
              activeCategory === cat.id && styles.categoryTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reyting ro'yxati */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.userId || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Ma'lumot topilmadi</Text>
          }
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, marginBottom: 16 },
  title: { color: '#F9FAFB', fontSize: 24, fontWeight: 'bold' },
  myRankCard: {
    marginHorizontal: 20, backgroundColor: '#161B22',
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#21262D',
  },
  myRankTitle: { color: '#9CA3AF', fontSize: 12, marginBottom: 12 },
  myRankRow: { flexDirection: 'row', justifyContent: 'space-around' },
  myRankItem: { alignItems: 'center', gap: 4 },
  myRankValue: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  myRankLabel: { color: '#6B7280', fontSize: 11 },
  categories: {
    flexDirection: 'row', paddingHorizontal: 20,
    marginBottom: 12, gap: 8,
  },
  categoryTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#161B22', borderRadius: 8,
    paddingVertical: 8, gap: 4,
    borderWidth: 1, borderColor: '#21262D',
  },
  categoryTabActive: { borderColor: '#4CAF50', backgroundColor: '#0a2a0a' },
  categoryText: { color: '#6B7280', fontSize: 11 },
  categoryTextActive: { color: '#4CAF50' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  entryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161B22', borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#21262D',
  },
  myEntry: { borderColor: '#4CAF50', backgroundColor: '#0a1a0a' },
  rank: { color: '#6B7280', fontSize: 14, width: 36, textAlign: 'center' },
  topRank: { fontSize: 20 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#21262D', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  entryInfo: { flex: 1 },
  username: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  level: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  value: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
});

export default LeaderboardScreen;
