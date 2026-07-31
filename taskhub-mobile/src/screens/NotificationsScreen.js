import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import Header from '../components/Header';
import { notificationService } from '../api';
import { colors } from '../theme';

const typeLabel = (t) => ({ Project: 'Dự án', Task: 'Công việc', Deadline: 'Hạn chót' }[t] || 'Thông báo');
const typeColor = (t) => ({ Project: colors.brandBlue, Task: '#7c3aed', Deadline: colors.rose }[t] || colors.slate400);

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (Number.isNaN(m)) return '';
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
};

export default function NotificationsScreen({ nav }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await notificationService.getAll();
      const list = (res.data || []).slice().sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setItems(list);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được thông báo.');
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markRead = async (item) => {
    if (item.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    try { await notificationService.markRead(item.id); } catch { /* không nghiêm trọng */ }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Thông báo" onBack={nav.pop} />

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
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có thông báo nào.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.cardUnread]}
              activeOpacity={0.8}
              onPress={() => markRead(item)}
            >
              <View style={styles.top}>
                <View style={[styles.typeTag, { backgroundColor: typeColor(item.type) }]}>
                  <Text style={styles.typeText}>{typeLabel(item.type)}</Text>
                </View>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.message}>{item.message}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: colors.rose, textAlign: 'center', marginBottom: 12 },
  retry: { color: colors.brandBlue, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.slate400, marginTop: 40 },
  card: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 14, marginBottom: 10,
  },
  cardUnread: { borderColor: '#bfdbfe', backgroundColor: '#f5f9ff' },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  typeTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandBlue },
  time: { marginLeft: 'auto', fontSize: 12, color: colors.slate400 },
  message: { fontSize: 14, color: colors.slate700, lineHeight: 20 },
});
