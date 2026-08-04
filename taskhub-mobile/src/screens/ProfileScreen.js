import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Header from '../components/Header';
import { colors } from '../theme';

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function ProfileScreen({ user, onLogout, nav, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };
  const name = user?.profile?.fullName || user?.username || user?.email || 'Người dùng';
  const isPremium = !!user?.subscription?.isPremium;

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Hồ sơ" />

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brandBlue} />}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(name)}</Text></View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{user?.email || '—'}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Tên đăng nhập" value={user?.username || '—'} />
          <Row label="Vai trò" value={user?.role || '—'} />
          <Row
            label="Gói dịch vụ"
            value={isPremium ? 'Premium' : 'Free'}
            valueColor={isPremium ? colors.emerald : colors.slate700}
          />
        </View>

        <TouchableOpacity style={styles.upgrade} onPress={() => nav?.push({ name: 'pricing' })} activeOpacity={0.85}>
          <Text style={styles.upgradeText}>{isPremium ? '👑 Quản lý gói Premium' : '⭐ Nâng cấp Premium'}</Text>
        </TouchableOpacity>

        {(user?.role || '').toLowerCase() === 'admin' ? (
          <TouchableOpacity style={styles.admin} onPress={() => nav?.push({ name: 'admin' })} activeOpacity={0.85}>
            <Text style={styles.adminText}>🛡️  Trang quản trị</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  hero: { alignItems: 'center', paddingVertical: 16 },
  avatar: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brandBlue,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  email: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200,
    padding: 16, marginTop: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  rowLabel: { fontSize: 14, color: colors.slate500 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  upgrade: {
    marginTop: 20, backgroundColor: colors.brandBlue, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  upgradeText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  admin: {
    marginTop: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: colors.white,
  },
  adminText: { color: colors.slate700, fontWeight: '700', fontSize: 15 },
  logout: {
    marginTop: 12, borderWidth: 1, borderColor: colors.slate300, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: colors.white,
  },
  logoutText: { color: colors.rose, fontWeight: '700', fontSize: 15 },
});
