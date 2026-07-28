import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

export default function HomeScreen({ user, onLogout }) {
  const name = user?.profile?.fullName || user?.username || user?.email || 'bạn';
  const isPremium = !!user?.subscription?.isPremium;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.slate50 }} contentContainerStyle={styles.container}>
      <Text style={styles.hello}>Chào, {name} 👋</Text>
      <Text style={styles.sub}>Bạn đã đăng nhập TaskHub Mobile.</Text>

      <View style={styles.card}>
        <Row label="Email" value={user?.email || '—'} />
        <Row label="Vai trò" value={user?.role || '—'} />
        <Row label="Gói dịch vụ" value={isPremium ? 'Premium' : 'Free'} valueColor={isPremium ? colors.emerald : colors.slate700} />
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Đây là bản nền tảng (P1). Các màn Dự án, Bảng công việc, Kho mật khẩu... sẽ được thêm ở các giai đoạn sau.
        </Text>
      </View>

      <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.slate900 },
  sub: { fontSize: 14, color: colors.slate500, marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.slate200, padding: 20,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { fontSize: 14, color: colors.slate500 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  note: { backgroundColor: colors.slate100, borderRadius: 14, padding: 16, marginTop: 20 },
  noteText: { fontSize: 13, color: colors.slate600, lineHeight: 19 },
  logout: {
    marginTop: 28, borderWidth: 1, borderColor: colors.slate300, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { color: colors.rose, fontWeight: '700', fontSize: 15 },
});
