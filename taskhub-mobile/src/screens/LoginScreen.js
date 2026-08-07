import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, saveToken } from '../api';
import { colors, gradients } from '../theme';
import { getGoogleIdToken, statusCodes } from '../google';
import GradientButton from '../components/GradientButton';

export default function LoginScreen({ onLoggedIn, onGoRegister, onGoForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) { setError('Không lấy được Google token.'); return; }
      const res = await authService.googleLogin(idToken);
      await saveToken(res.data.token);
      onLoggedIn();
    } catch (e) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) { /* người dùng huỷ */ }
      else setError(e.response?.data?.message || e.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
      await saveToken(res.data.token);
      onLoggedIn();
    } catch (e) {
      const msg = typeof e.response?.data === 'string'
        ? e.response.data
        : e.response?.data?.message || e.message || 'Đăng nhập thất bại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.slate50 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
          <Text style={styles.logoText}>TH</Text>
        </LinearGradient>
        <Text style={styles.title}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Đăng nhập để quản lý dự án của bạn</Text>

        {error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        <Text style={styles.label}>Địa chỉ email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ban@congty.vn"
          placeholderTextColor={colors.slate400}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.pwRow}>
          <TextInput
            style={styles.pwInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.slate400}
            secureTextEntry={!showPw}
            editable={!loading}
          />
          <TouchableOpacity style={styles.pwToggle} onPress={() => setShowPw((s) => !s)}>
            <Text style={styles.pwToggleText}>{showPw ? 'Ẩn' : 'Hiện'}</Text>
          </TouchableOpacity>
        </View>

        <GradientButton title="Đăng nhập" onPress={handleLogin} loading={loading} />

        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>hoặc</Text>
          <View style={styles.divLine} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Đăng nhập bằng Google</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Lần đăng nhập đầu có thể mất 30–60 giây nếu server vừa khởi động lại.
        </Text>

        <TouchableOpacity onPress={onGoForgot} style={{ marginTop: 18 }}>
          <Text style={styles.forgot}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onGoRegister} style={{ marginTop: 14 }}>
          <Text style={styles.bottomLink}>Chưa có tài khoản? <Text style={styles.bottomLinkStrong}>Đăng ký</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    width: 64, height: 64, borderRadius: 18, alignSelf: 'center',
    backgroundColor: colors.brandBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoText: { color: colors.white, fontSize: 24, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '800', color: colors.slate900, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  errorBox: { backgroundColor: colors.roseBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: colors.rose, fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', color: colors.slate700, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: colors.slate900, backgroundColor: colors.white, marginBottom: 16,
  },
  pwRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.slate300,
    borderRadius: 12, backgroundColor: colors.white, marginBottom: 20, paddingRight: 6,
  },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.slate900 },
  pwToggle: { paddingHorizontal: 12, paddingVertical: 8 },
  pwToggleText: { color: colors.brandBlue, fontWeight: '600', fontSize: 14 },
  button: {
    backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.slate400, textAlign: 'center', marginTop: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.slate200 },
  divText: { marginHorizontal: 10, color: colors.slate400, fontSize: 12, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, paddingVertical: 13, backgroundColor: colors.white,
  },
  googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '700', color: colors.slate700 },
  forgot: { textAlign: 'center', color: colors.brandBlue, fontWeight: '600', fontSize: 14 },
  bottomLink: { textAlign: 'center', color: colors.slate500, fontSize: 14 },
  bottomLinkStrong: { color: colors.brandBlue, fontWeight: '700' },
});

