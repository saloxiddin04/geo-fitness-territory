// // Bosh sahifa - dashboard
// import React, { useEffect, useState } from 'react';
// import {
//   View, Text, ScrollView, StyleSheet,
//   TouchableOpacity, RefreshControl, StatusBar,
// } from 'react-native';
// import { useDispatch, useSelector } from 'react-redux';
// import { useNavigation } from '@react-navigation/native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import LinearGradient from 'react-native-linear-gradient';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import api from '../../services/api.service';
// import { NIGHT_EVENT, XP_PER_LEVEL } from '../../constants';
//
// const HomeScreen = () => {
//   const navigation = useNavigation();
//   const insets = useSafeAreaInsets();
//   const { user } = useSelector(state => state.auth);
//   const { isRunning } = useSelector(state => state.running);
//   const { unreadCount } = useSelector(state => state.notification);
//
//   const [stats, setStats] = useState(null);
//   const [isNightEvent, setIsNightEvent] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//
//   const fetchStats = async () => {
//     try {
//       const response = await api.get('/fitness/stats');
//       // Backend flat structure: { success, data: { totalDistanceMeters, ... } }
//       setStats(response.data.data);
//     } catch (e) {
//       console.error('Stats yuklash xatosi:', e.message);
//     }
//
//     // Night event holati
//     const hour = new Date().getHours();
//     setIsNightEvent(hour >= NIGHT_EVENT.START_HOUR && hour < NIGHT_EVENT.END_HOUR);
//   };
//
//   useEffect(() => {
//     fetchStats();
//   }, []);
//
//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchStats();
//     setRefreshing(false);
//   };
//
//   // XP progress bar
//   const totalXP = user?.totalXP ?? user?.xp ?? 0;
//   const xpProgress = (totalXP % XP_PER_LEVEL) / XP_PER_LEVEL;
//
//   return (
//     <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#0D1117" />
//
//       {/* Scroll qilinadigan yuqori qism */}
//       <ScrollView
//         contentContainerStyle={[
//           styles.scrollContent,
//           { paddingTop: insets.top + 8 },
//         ]}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor="#4CAF50"
//           />
//         }
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <View>
//             <Text style={styles.greeting}>Salom, {user?.username} 👋</Text>
//             <Text style={styles.subGreeting}>Bugun ham yugurish vaqti!</Text>
//           </View>
//           <TouchableOpacity
//             style={styles.notifButton}
//             onPress={() => navigation.navigate('Notifications')}
//           >
//             <Icon name="bell" size={24} color="#9CA3AF" />
//             {unreadCount > 0 && (
//               <View style={styles.notifBadge}>
//                 <Text style={styles.notifBadgeText}>
//                   {unreadCount > 9 ? '9+' : unreadCount}
//                 </Text>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>
//
//         {/* Night Event banner */}
//         {isNightEvent && (
//           <LinearGradient
//             colors={['#1a0a2e', '#2d1b69']}
//             style={styles.nightEventBanner}
//           >
//             <Icon name="weather-night" size={20} color="#A78BFA" />
//             <View style={{ marginLeft: 10 }}>
//               <Text style={styles.nightEventTitle}>🌙 Night Event Faol!</Text>
//               <Text style={styles.nightEventText}>
//                 XP 1.5x ko'paytiruvchida
//               </Text>
//             </View>
//           </LinearGradient>
//         )}
//
//         {/* Foydalanuvchi darajasi */}
//         <View style={styles.levelCard}>
//           <View style={styles.levelHeader}>
//             <View style={styles.levelBadge}>
//               <Text style={styles.levelNumber}>{user?.level || 1}</Text>
//             </View>
//             <View style={styles.levelInfo}>
//               <Text style={styles.levelTitle}>Daraja {user?.level || 1}</Text>
//               <Text style={styles.xpText}>
//                 {totalXP % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
//               </Text>
//             </View>
//           </View>
//           <View style={styles.progressBar}>
//             <View
//               style={[styles.progressFill, { width: `${xpProgress * 100}%` }]}
//             />
//           </View>
//         </View>
//
//         {/* Tezkor statistikalar */}
//         {stats && (
//           <View style={styles.statsGrid}>
//             <StatCard
//               icon="map-marker-radius"
//               title="Hudud"
//               value={stats.territoriesCount || 0}
//               unit="ta"
//               color="#4CAF50"
//             />
//             <StatCard
//               icon="run"
//               title="Masofa"
//               value={((stats.totalDistanceMeters || 0) / 1000).toFixed(1)}
//               unit="km"
//               color="#2196F3"
//             />
//             <StatCard
//               icon="eye"
//               title="Ochilgan"
//               value={stats.totalExploredCells || 0}
//               unit="hujayra"
//               color="#FF9800"
//             />
//             <StatCard
//               icon="fire"
//               title="Kaloriya"
//               value={Math.round(stats.totalCalories || 0)}
//               unit="kcal"
//               color="#F44336"
//             />
//           </View>
//         )}
//       </ScrollView>
//
//       {/* Harakatlar — har doim pastda ko'rinadi (scroll ga bog'liq emas) */}
//       <View style={styles.actionsFooter}>
//         <Text style={styles.sectionTitle}>Harakatlar</Text>
//
//         <TouchableOpacity
//           style={styles.startRunButton}
//           onPress={() => navigation.navigate('Running')}
//         >
//           <LinearGradient
//             colors={isRunning ? ['#F44336', '#C62828'] : ['#4CAF50', '#388E3C']}
//             style={styles.startRunGradient}
//           >
//             <Icon
//               name={isRunning ? 'stop-circle' : 'run-fast'}
//               size={24}
//               color="#fff"
//             />
//             <Text style={styles.startRunText}>
//               {isRunning
//                 ? '⚡ Yugurish davom etmoqda...'
//                 : '🏃 Yugurish boshlash'}
//             </Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>
//     </LinearGradient>
//   );
// };
//
// // Stat kartochkasi
// const StatCard = ({ icon, title, value, unit, color }) => (
//   <View style={styles.statCard}>
//     <Icon name={icon} size={24} color={color} />
//     <Text style={styles.statValue}>{value}</Text>
//     <Text style={styles.statUnit}>{unit}</Text>
//     <Text style={styles.statTitle}>{title}</Text>
//   </View>
// );
//
// // Harakatlar tugmasi
// const ActionButton = ({ icon, title, onPress }) => (
//   <TouchableOpacity style={styles.actionButton} onPress={onPress}>
//     <View style={styles.actionIcon}>
//       <Icon name={icon} size={24} color="#4CAF50" />
//     </View>
//     <Text style={styles.actionTitle}>{title}</Text>
//   </TouchableOpacity>
// );
//
// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
//   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
//   greeting: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB' },
//   subGreeting: { fontSize: 13, color: '#6B7280', marginTop: 2 },
//   notifButton: { padding: 8, position: 'relative' },
//   notifBadge: {
//     position: 'absolute', top: 2, right: 2,
//     backgroundColor: '#F44336', borderRadius: 8,
//     minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
//   },
//   notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
//   nightEventBanner: {
//     flexDirection: 'row', alignItems: 'center',
//     borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
//     borderWidth: 1, borderColor: '#4C1D95',
//   },
//   nightEventTitle: { color: '#A78BFA', fontWeight: 'bold', fontSize: 14 },
//   nightEventText: { color: '#C4B5FD', fontSize: 11, marginTop: 1 },
//   levelCard: {
//     backgroundColor: '#161B22', borderRadius: 12,
//     paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
//     borderWidth: 1, borderColor: '#21262D',
//   },
//   levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
//   levelBadge: {
//     width: 40, height: 40, borderRadius: 20,
//     backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
//   },
//   levelNumber: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   levelInfo: { marginLeft: 10 },
//   levelTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '600' },
//   xpText: { color: '#6B7280', fontSize: 12, marginTop: 1 },
//   progressBar: { height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden' },
//   progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
//   statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   statCard: {
//     flex: 1, minWidth: '45%', backgroundColor: '#161B22',
//     borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center',
//     borderWidth: 1, borderColor: '#21262D',
//   },
//   statValue: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold', marginTop: 6 },
//   statUnit: { color: '#6B7280', fontSize: 11 },
//   statTitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
//   actionsFooter: {
//     paddingHorizontal: 16,
//     paddingTop: 52,
//     paddingBottom: 30,
//     borderTopWidth: 1,
//     borderTopColor: '#21262D',
//     backgroundColor: '#0D1117',
//   },
//   sectionTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '600', marginBottom: 8 },
//   startRunButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 50 },
//   startRunGradient: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//     paddingVertical: 14, gap: 10,
//   },
//   startRunText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
//   actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4 },
//   actionButton: { alignItems: 'center', flex: 1, paddingVertical: 4 },
//   actionIcon: {
//     width: 48, height: 48, borderRadius: 24,
//     backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D',
//     justifyContent: 'center', alignItems: 'center', marginBottom: 4,
//   },
//   actionTitle: { color: '#9CA3AF', fontSize: 11 },
// });
//
// export default HomeScreen;

// Bosh sahifa - dashboard
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api.service';
import { NIGHT_EVENT, XP_PER_LEVEL } from '../../constants';

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useSelector(state => state.auth);
  const { isRunning } = useSelector(state => state.running);
  const { unreadCount } = useSelector(state => state.notification);

  const [stats, setStats] = useState(null);
  const [isNightEvent, setIsNightEvent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/fitness/stats');
      setStats(response.data.data);
    } catch (e) {
      console.error('Stats yuklash xatosi:', e.message);
    }

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

  const totalXP = user?.totalXP ?? user?.xp ?? 0;
  const xpProgress = (totalXP % XP_PER_LEVEL) / XP_PER_LEVEL;

  // 6 ta asosiy harakatlar tugmalari
  const actionButtons = [
    { icon: 'home', title: 'Bosh sahi...', route: 'Home' },
    { icon: 'arm-flex', title: 'Fitness', route: 'Fitness' },
    { icon: 'map', title: 'Xarita', route: 'Map' },
    { icon: 'run-fast', title: 'Yugurish', route: 'Running' },
    { icon: 'trophy', title: 'Reyting', route: 'Leaderboard' },
    { icon: 'account', title: 'Profil', route: 'Profile' },
  ];

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 20, // Pastdan yetarli joy
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Salom, {user?.username} 👋</Text>
            <Text style={styles.subGreeting}>Bugun ham yugurish vaqti!</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Notifications')}
          >
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
          <LinearGradient
            colors={['#1a0a2e', '#2d1b69']}
            style={styles.nightEventBanner}
          >
            <Icon name="weather-night" size={20} color="#A78BFA" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.nightEventTitle}>🌙 Night Event Faol!</Text>
              <Text style={styles.nightEventText}>
                XP 1.5x ko'paytiruvchida
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
                {totalXP % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${xpProgress * 100}%` }]}
            />
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

        {/* Harakatlar - ScrollView ichiga o'tkazildi */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Harakatlar</Text>

          {/* Yugurish boshlash tugmasi */}
          <View style={styles.startRunButton}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ width: '100%' }}
              onPress={() => navigation.navigate('Running')}
            >
              <LinearGradient
                colors={
                  isRunning ? ['#F44336', '#C62828'] : ['#4CAF50', '#388E3C']
                }
                style={styles.startRunGradient}
              >
                <Icon
                  name={isRunning ? 'stop-circle' : 'run-fast'}
                  size={34}
                  color="#FFFFFF"
                />
                <Text style={styles.startRunText}>
                  {isRunning
                    ? 'Yugurish davom etmoqda...'
                    : 'Yugurishni boshlash'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB' },
  subGreeting: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notifButton: { padding: 8, position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#F44336',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  nightEventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4C1D95',
  },
  nightEventTitle: { color: '#A78BFA', fontWeight: 'bold', fontSize: 14 },
  nightEventText: { color: '#C4B5FD', fontSize: 11, marginTop: 1 },
  levelCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  levelInfo: { marginLeft: 10 },
  levelTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '600' },
  xpText: { color: '#6B7280', fontSize: 12, marginTop: 1 },
  progressBar: {
    height: 6,
    backgroundColor: '#21262D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#161B22',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21262D',
  },
  statValue: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  statUnit: { color: '#6B7280', fontSize: 11 },
  statTitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },

  // Harakatlar bo'limi
  actionsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  startRunButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
  },

  startRunGradient: {
    width: '100%',
    minHeight: 50, // tugma balandligi
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },

  startRunText: {
    color: '#FFFFFF',
    fontSize: 22, // yozuv kattaroq
    fontWeight: '700',
    marginLeft: 14,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default HomeScreen;
