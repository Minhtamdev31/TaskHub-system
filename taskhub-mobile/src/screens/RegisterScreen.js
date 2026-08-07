import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { authService } from '../api';
import { colors } from '../theme';
import GradientButton from '../components/GradientButton';

const getErr = (e, fb) =>
  (typeof e.response?.data === 'string' ? e.response.data : e.response?.data?.message) || e.message || fb;

export default function RegisterScreen({ onRegistered, onGoLogin }) {
  const [step, setStep] = useState(1); // 1: nhập thông tin, 2: nhập OTP
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submitInfo = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Nhập đủ tên người dùng, email và mật khẩu.'); return;
    }
    if (form.password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự.'); return; }
    if (form.password !== form.confirm) { setError('Mật khẩu nhập lại không khớp.'); return; }
    setLoading(true); setError('');
    try {
      await authService.register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      setInfo(`Đã gửi mã OTP tới ${form.email.trim()}.`);
      setStep(2);
    } catch (e) {
      setError(getErr(e, 'Đăng ký thất bại.'));
    } finally { setLoading(false); }
  };

  const submitOtp = async () => {
    if (!otp.trim()) { setError('Nhập mã OTP.'); return; }
    setLoading(true); setError('');
    try {
      await authService.verifyRegisterOtp({
        username: form.username.trim(), email: form.email.trim(), password: form.password, otpCode: otp.trim(),
      });
      onRegistered?.(); // báo đăng ký xong → về màn đăng nhập
    } catch (e) {
      setError(getErr(e, 'Xác minh OTP thất bại.'));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.slate50 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><Text style={styles.logoText}>TH</Text></View>
        <Text style={styles.title}>{step === 1 ? 'Tạo tài khoản' : 'Xác minh email'}</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Tham gia TaskHub để bắt đầu' : `Nhập mã 6 số đã gửi tới ${form.email.trim()}`}
        </Text>

        {info && step === 2 ? <View style={styles.infoBox}><Text style={styles.infoText}>{info}</Text></View> : null}
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {step === 1 ? (
          <>
            <TextInput style={styles.input} value={form.username} onChangeText={(v) => setForm({ ...form, username: v })}
              placeholder="Tên người dùng" placeholderTextColor={colors.slate400} autoCapitalize="none" editable={!loading} />
            <TextInput style={styles.input} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })}
              placeholder="Email" placeholderTextColor={colors.slate400} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
            <TextInput style={styles.input} value={form.password} onChangeText={(v) => setForm({ ...form, password: v })}
              placeholder="Mật khẩu (≥ 6 ký tự)" placeholderTextColor={colors.slate400} secureTextEntry editable={!loading} />
            <TextInput style={styles.input} value={form.confirm} onChangeText={(v) => setForm({ ...form, confirm: v })}
              placeholder="Nhập lại mật khẩu" placeholderTextColor={colors.slate400} secureTextEntry editable={!loading} />
            <GradientButton title="Gửi mã OTP" onPress={submitInfo} loading={loading} />
          </>
        ) : (
          <>
            <TextInput style={[styles.input, styles.otp]} value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
              placeholder="Mã 6 số" placeholderTextColor={colors.slate400} keyboardType="number-pad" maxLength={6} editable={!loading} />
            <GradientButton title="Xác minh & hoàn tất" onPress={submitOtp} loading={loading} />
            <TouchableOpacity onPress={() => { setStep(1); setError(''); }}>
              <Text style={styles.link}>Quay lại</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={onGoLogin} style={{ marginTop: 20 }}>
          <Text style={styles.bottomLink}>Đã có tài khoản? <Text style={styles.bottomLinkStrong}>Đăng nhập</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 60, height: 60, borderRadius: 16, alignSelf: 'center', backgroundColor: colors.brandBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logoText: { color: colors.white, fontSize: 22, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800', color: colors.slate900, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 12 },
  infoText: { color: '#1d4ed8', fontSize: 13 },
  errorBox: { backgroundColor: colors.roseBg, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: colors.rose, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.slate900, backgroundColor: colors.white, marginBottom: 12 },
  otp: { textAlign: 'center', letterSpacing: 6, fontSize: 18 },
  button: { backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  link: { color: colors.slate500, textAlign: 'center', marginTop: 14, fontWeight: '600' },
  bottomLink: { textAlign: 'center', color: colors.slate500, fontSize: 14 },
  bottomLinkStrong: { color: colors.brandBlue, fontWeight: '700' },
});
