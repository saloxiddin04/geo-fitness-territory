// Sozlamalar ekrani
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StorageUtils } from '../../utils/storage';

const DEFAULT_SETTINGS = {
  notifications: true,
  territoryAttack: true,
  nightEvent: true,
  sound: true,
  vibration: true,
};

const SettingsScreen = () => {
  const [settings, setSettings] = useState(() => {
    const saved = StorageUtils.getObject('app_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      StorageUtils.setObject('app_settings', newSettings);
      return newSettings;
    });
  };

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚙️ Sozlamalar</Text>

        <Section title="Bildirishnomalar">
          <SettingRow
            icon="bell"
            label="Bildirishnomalar"
            value={settings.notifications}
            onChange={v => updateSetting('notifications', v)}
          />
          <SettingRow
            icon="sword-cross"
            label="Hujum bildirishnomalari"
            value={settings.territoryAttack}
            onChange={v => updateSetting('territoryAttack', v)}
          />
          <SettingRow
            icon="weather-night"
            label="Night Event bildirishmasi"
            value={settings.nightEvent}
            onChange={v => updateSetting('nightEvent', v)}
          />
        </Section>

        <Section title="Ovoz va tebranish">
          <SettingRow
            icon="volume-high"
            label="Ovoz"
            value={settings.sound}
            onChange={v => updateSetting('sound', v)}
          />
          <SettingRow
            icon="vibrate"
            label="Tebranish"
            value={settings.vibration}
            onChange={v => updateSetting('vibration', v)}
          />
        </Section>

        <Section title="Ilova haqida">
          <InfoRow icon="information" label="Versiya" value="1.0.0" />
          <InfoRow icon="shield-check" label="Maxfiylik siyosati" />
          <InfoRow icon="file-document" label="Foydalanish shartlari" />
        </Section>
      </ScrollView>
    </LinearGradient>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingRow = ({ icon, label, value, onChange }) => (
  <View style={styles.row}>
    <Icon name={icon} size={20} color="#4CAF50" />
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#374151', true: '#4CAF50' }}
      thumbColor="#ffffff"
    />
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <TouchableOpacity style={styles.row}>
    <Icon name={icon} size={20} color="#6B7280" />
    <Text style={styles.rowLabel}>{label}</Text>
    {value && <Text style={styles.infoValue}>{value}</Text>}
    {!value && <Icon name="chevron-right" size={18} color="#6B7280" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#6B7280', fontSize: 12, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  sectionContent: {
    backgroundColor: '#161B22', borderRadius: 12,
    borderWidth: 1, borderColor: '#21262D', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#21262D',
  },
  rowLabel: { color: '#F9FAFB', flex: 1, fontSize: 15 },
  infoValue: { color: '#6B7280', fontSize: 14 },
});

export default SettingsScreen;
