import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import Header from '../components/Header';
import { adminService } from '../api';
import { colors } from '../theme';
import { formatVnd } from '../constants';

const orderStatusMeta = (s) => ({
  Paid: { label: 'Đã thanh toán', bg: '#d1fae5', text: '#047857' },
  Completed: { label: 'Đã thanh toán', bg: '#d1fae5', text: '#047857' },
  Pending: { label: 'Đang xử lý', bg: '#fef3c7', text: '#b45309' },
  Processing: { label: 'Đang xử lý', bg: '#fef3c7', text: '#b45309' },
  Cancelled: { label: 'Đã huỷ', bg: colors.slate100, text: colors.slate500 },
  Canceled: { label: 'Đã huỷ', bg: colors.slate100, text: colors.slate500 },
  Failed: { label: 'Thất bại', bg: '#ffe4e6', text: '#be123c' },
  Expired: { label: 'Hết hạn', bg: colors.slate100, text: colors.slate500 },
}[s] || { label: s || '—', bg: colors.slate100, text: colors.slate500 });

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminScreen({ nav }) {
  const [dash, setDash] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [dRes, oRes, uRes] = await Promise.all([
        adminService.getDashboard().catch(() => ({ data: null })),
        adminService.getOrders(1, 20).catch(() => ({ data: { items: [] } })),
        adminService.getUsers(1, 20).catch(() => ({ data: { items: [] } })),
      ]);
      setDash(dRes.data);
      setOrders(oRes.data?.items || []);
      setUsers(uRes.data?.items || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được dữ liệu quản trị.');
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const d = dash || {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Quản trị" subtitle="Chỉ xem trên mobile" onBack={nav.pop} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load().then(() => setLoading(false)); }}>
            <Text style={styles.retry}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
        >
          <View style={styles.statRow}>
            <View style={[styles.stat, { borderTopColor: colors.emerald }]}>
              <Text style={styles.statLabel}>Tổng doanh thu</Text>
              <Text style={styles.statValue}>{formatVnd(d.totalRevenue)}</Text>
            </View>
            <View style={[styles.stat, { borderTopColor: colors.brandBlue }]}>
              <Text style={styles.statLabel}>Giao dịch thành công</Text>
              <Text style={styles.statValue}>{d.totalSuccessTransactions ?? 0}</Text>
            </View>
          </View>

          <Text style={styles.section}>Đơn hàng gần đây</Text>
          {orders.length === 0 ? <Text style={styles.empty}>Chưa có đơn hàng.</Text> : (
            orders.map((o) => {
              const st = orderStatusMeta(o.status);
              return (
                <View key={o.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.plan} numberOfLines={1}>{o.planTitle || 'Gói'}</Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.amount}>{formatVnd(o.amount)}</Text>
                  <Text style={styles.meta}>
                    {o.paymentGateway ? `${o.paymentGateway} · ` : ''}{o.paymentCode || ''}
                  </Text>
                  <Text style={styles.date}>{fmtDate(o.createdAt)}</Text>
                </View>
              );
            })
          )}

          <Text style={styles.section}>Người dùng</Text>
          {users.length === 0 ? <Text style={styles.empty}>Chưa có người dùng.</Text> : (
            users.map((u) => {
              const isAdmin = (u.role || '').toLowerCase() === 'admin';
              const isPremium = !!u.subscription?.isPremium;
              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{u.username}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                  </View>
                  {isPremium ? <Text style={styles.premiumTag}>Premium</Text> : null}
                  <View style={[styles.roleTag, isAdmin && { backgroundColor: '#ede9fe' }]}>
                    <Text style={[styles.roleText, isAdmin && { color: '#6d28d9' }]}>{u.role || 'Member'}</Text>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: colors.rose, textAlign: 'center' },
  retry: { color: colors.brandBlue, fontWeight: '700', marginTop: 8 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200,
    borderTopWidth: 4, padding: 16,
  },
  statLabel: { fontSize: 12, color: colors.slate500, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.slate900, marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: colors.slate900, marginTop: 24, marginBottom: 12 },
  empty: { color: colors.slate400 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  plan: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  amount: { fontSize: 17, fontWeight: '800', color: colors.slate900, marginTop: 6 },
  meta: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  date: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: colors.slate200, padding: 12, marginBottom: 8,
  },
  userName: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  userEmail: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  premiumTag: { fontSize: 11, fontWeight: '800', color: colors.emerald },
  roleTag: { backgroundColor: colors.slate100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: '800', color: colors.slate600 },
});
