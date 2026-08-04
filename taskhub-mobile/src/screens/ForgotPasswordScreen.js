import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { authService } from '../api';
import { colors } from '../theme';

const getErr = (e, fb) =>
  (typeof e.response?.data === 'string' ? e.response.data : e.response?.data?.message) || e.message || fb;

export default function ForgotPasswordScreen({ onDone, onGoLogin }) {
  const [step, setStep] = useState(1); // 1: nhập email, 2: OTP + mật khẩu mới
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendOtp = async () => {
    if (!email.trim()) { setError('Nhập email.'); return; }
    setLoading(true); setError('');
    try {
      await authService.forgotPassword(email.trim());
      setInfo(`Đã gửi mã OTP tới ${email.trim()}.`);
      setStep(2);
    } catch (e) {
      setError(getErr(e, 'Không gửi được mã OTP.'));
    } finally { setLoading(false); }
  };

  const reset = async () => {
    if (!otp.trim()) { setError('Nhập mã OTP.'); return; }
    if (pw.length < 6) { setError('Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (pw !== confirm) { setError('Mật khẩu nhập lại không khớp.'); return; }
    setLoading(true); setError('');
    try {
      await authService.resetPassword({ email: email.trim(), otpCode: otp.trim(), newPassword: pw });
      onDone?.(); // xong → về đăng nhập
    } catch (e) {
      setError(getErr(e, 'Đặt lại mật khẩu thất bại.'));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.slate50 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><Text style={{ fontSize: 26 }}>🔑</Text></View>
        <Text style={styles.title}>Đặt lại mật khẩu</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Nhập email để nhận mã đặt lại' : 'Nhập mã OTP và mật khẩu mới'}
        </Text>

        {info && step === 2 ? <View style={styles.infoBox}><Text style={styles.infoText}>{info}</Text></View> : null}
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {step === 1 ? (
          <>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor={colors.slate400} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={sendOtp} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Gửi mã đặt lại</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={[styles.input, styles.otp]} value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
              placeholder="Mã 6 số" placeholderTextColor={colors.slate400} keyboardType="number-pad" maxLength={6} editable={!loading} />
            <TextInput style={styles.input} value={pw} onChangeText={setPw}
              placeholder="Mật khẩu mới (≥ 6 ký tự)" placeholderTextColor={colors.slate400} secureTextEntry editable={!loading} />
            <TextInput style={styles.input} value={confirm} onChangeText={setConfirm}
              placeholder="Nhập lại mật khẩu mới" placeholderTextColor={colors.slate400} secureTextEntry editable={!loading} />
            <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={reset} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep(1); setError(''); }}>
              <Text style={styles.link}>Chưa nhận được mã? Thử lại</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={onGoLogin} style={{ marginTop: 20 }}>
          <Text style={styles.bottomLink}>← Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 60, height: 60, borderRadius: 16, alignSelf: 'center', backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
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
  bottomLink: { textAlign: 'center', color: colors.brandBlue, fontSize: 14, fontWeight: '700' },
});
