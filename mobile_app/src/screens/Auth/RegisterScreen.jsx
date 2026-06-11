// Ro'yxatdan o'tish ekrani
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { UZBEKISTAN_REGIONS } from '../../constants';
import { handleLocationPermissionAfterAuth } from '../../utils/permissions';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(state => state.auth);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    region: 'toshkent_shahar', // backend region IDs bilan mos
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Xato', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    // Backend: alphanum only, 3-50 chars (Joi .alphanum())
    if (!form.username.trim() || form.username.length < 3) {
      errors.username = 'Username kamida 3 ta belgi';
    } else if (form.username.length > 50) {
      errors.username = 'Username maksimal 50 ta belgi';
    } else if (!/^[a-zA-Z0-9]+$/.test(form.username)) {
      errors.username = 'Username faqat harf va raqamlardan iborat bo\'lishi kerak';
    }
    // Backend: valid email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'To\'g\'ri email manzil kiriting';
    }
    // Backend: min 8, lowercase + uppercase + digit
    if (form.password.length < 8) {
      errors.password = 'Parol kamida 8 ta belgi';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Parol katta harf, kichik harf va raqam o\'z ichiga olishi kerak';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Parollar mos emas';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const { confirmPassword, ...userData } = form;
    const result = await dispatch(registerUser(userData));
    if (result.meta.requestStatus === 'fulfilled') {
      // Ro'yxatdan o'tgandan so'ng GPS ruxsatini so'raymiz
      handleLocationPermissionAfterAuth(true);
    }
  };

  const selectedRegionName = UZBEKISTAN_REGIONS.find(r => r.id === form.region)?.name;

  return (
    <LinearGradient colors={['#0D1117', '#161B22', '#0D1117']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.title}>Ro'yxatdan o'tish</Text>
            <Text style={styles.subtitle}>O'yinni boshlash uchun akkaunt yarating</Text>
          </View>

          <View style={styles.form}>
            {/* To'liq ism */}
            <InputField
              label="To'liq ism"
              icon="account"
              value={form.fullName}
              onChangeText={v => updateField('fullName', v)}
              placeholder="Ism Familiya"
              error={formErrors.fullName}
            />

            {/* Username */}
            <InputField
              label="Username"
              icon="at"
              value={form.username}
              onChangeText={v => updateField('username', v.toLowerCase())}
              placeholder="username123"
              error={formErrors.username}
              autoCapitalize="none"
            />

            {/* Email */}
            <InputField
              label="Email"
              icon="email"
              value={form.email}
              onChangeText={v => updateField('email', v)}
              placeholder="email@example.com"
              error={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Viloyat */}
            <Text style={styles.label}>Viloyat</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowRegionPicker(!showRegionPicker)}>
              <Icon name="map-marker" size={20} color="#6B7280" style={styles.inputIcon} />
              <Text style={styles.regionText}>{selectedRegionName}</Text>
              <Icon name={showRegionPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
            </TouchableOpacity>

            {showRegionPicker && (
              <View style={styles.pickerContainer}>
                {UZBEKISTAN_REGIONS.map(region => (
                  <TouchableOpacity
                    key={region.id}
                    style={[
                      styles.regionOption,
                      form.region === region.id && styles.regionOptionActive,
                    ]}
                    onPress={() => {
                      updateField('region', region.id);
                      setShowRegionPicker(false);
                    }}>
                    <Text style={[
                      styles.regionOptionText,
                      form.region === region.id && styles.regionOptionTextActive,
                    ]}>
                      {region.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Parol */}
            <Text style={[styles.label, { marginTop: 16 }]}>Parol</Text>
            <View style={[styles.inputContainer, formErrors.password && styles.inputError]}>
              <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kamida 8 ta belgi"
                placeholderTextColor="#4B5563"
                value={form.password}
                onChangeText={v => updateField('password', v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}

            {/* Parolni tasdiqlash */}
            <InputField
              label="Parolni tasdiqlash"
              icon="lock-check"
              value={form.confirmPassword}
              onChangeText={v => updateField('confirmPassword', v)}
              placeholder="Parolni qayta kiriting"
              error={formErrors.confirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}>
              <LinearGradient
                colors={isLoading ? ['#374151', '#374151'] : ['#4CAF50', '#388E3C']}
                style={styles.buttonGradient}>
                <Text style={styles.buttonText}>
                  {isLoading ? 'Ro\'yxatdan o\'tilmoqda...' : 'Ro\'yxatdan o\'tish'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
              <Text style={styles.loginText}>
                Akkaunting bormi? <Text style={styles.loginLinkText}>Kirish</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// Reusable input component
const InputField = ({ label, icon, error, secureTextEntry, ...props }) => (
  <View style={{ marginTop: 16 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, error && styles.inputError]}>
      <Icon name={icon} size={20} color="#6B7280" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholderTextColor="#4B5563"
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  backButton: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F9FAFB' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  form: {},
  label: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161B22', borderRadius: 12,
    borderWidth: 1, borderColor: '#21262D',
    paddingHorizontal: 12, height: 52,
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#F9FAFB', fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  regionText: { flex: 1, color: '#F9FAFB', fontSize: 16 },
  pickerContainer: {
    backgroundColor: '#161B22', borderRadius: 12,
    borderWidth: 1, borderColor: '#21262D', marginTop: 4,
    maxHeight: 200,
  },
  regionOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  regionOptionActive: { backgroundColor: '#1a3a1a' },
  regionOptionText: { color: '#9CA3AF', fontSize: 14 },
  regionOptionTextActive: { color: '#4CAF50', fontWeight: '600' },
  registerButton: { marginTop: 28, borderRadius: 12, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLinkText: { color: '#4CAF50', fontWeight: '600' },
});

export default RegisterScreen;
