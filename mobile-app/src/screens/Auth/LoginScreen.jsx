// Login ekrani
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { loginUser, clearError } from '../../store/slices/authSlice';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(state => state.auth);

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Xatoni tozalash
  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Xato', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Form validatsiya
  const validate = () => {
    const errors = {};
    if (!emailOrUsername.trim()) {
      errors.emailOrUsername = 'Email yoki username kiriting';
    }
    if (!password) {
      errors.password = 'Parol kiriting';
    } else if (password.length < 6) {
      errors.password = 'Parol kamida 6 ta belgi';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    dispatch(loginUser({ emailOrUsername: emailOrUsername.trim(), password }));
  };

  return (
    <LinearGradient colors={['#0D1117', '#161B22', '#0D1117']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Logo va sarlavha */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="run-fast" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.title}>Geo Fitness</Text>
            <Text style={styles.subtitle}>Territory Game</Text>
          </View>

          {/* Login form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email yoki Username</Text>
            <View style={[styles.inputContainer, formErrors.emailOrUsername && styles.inputError]}>
              <Icon name="account" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="email@example.com yoki username"
                placeholderTextColor="#4B5563"
                value={emailOrUsername}
                onChangeText={text => {
                  setEmailOrUsername(text);
                  if (formErrors.emailOrUsername) {
                    setFormErrors(prev => ({ ...prev, emailOrUsername: null }));
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            {formErrors.emailOrUsername ? (
              <Text style={styles.errorText}>{formErrors.emailOrUsername}</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 16 }]}>Parol</Text>
            <View style={[styles.inputContainer, formErrors.password && styles.inputError]}>
              <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Parolni kiriting"
                placeholderTextColor="#4B5563"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (formErrors.password) {
                    setFormErrors(prev => ({ ...prev, password: null }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {formErrors.password ? (
              <Text style={styles.errorText}>{formErrors.password}</Text>
            ) : null}

            {/* Kirish tugmasi */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}>
              <LinearGradient
                colors={isLoading ? ['#374151', '#374151'] : ['#4CAF50', '#388E3C']}
                style={styles.loginButtonGradient}>
                {isLoading ? (
                  <Text style={styles.loginButtonText}>Kirilmoqda...</Text>
                ) : (
                  <Text style={styles.loginButtonText}>Kirish</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Ro'yxatdan o'tish */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>
                Akkaunt yo'qmi?{' '}
                <Text style={styles.registerLinkText}>Ro'yxatdan o'ting</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#F9FAFB', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#4CAF50', marginTop: 4 },
  form: {},
  label: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#21262D',
    paddingHorizontal: 12,
    height: 52,
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#F9FAFB', fontSize: 16 },
  eyeButton: { padding: 4 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  loginButton: { marginTop: 28, borderRadius: 12, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonGradient: { height: 52, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: '#6B7280', fontSize: 14 },
  registerLinkText: { color: '#4CAF50', fontWeight: '600' },
});

export default LoginScreen;
