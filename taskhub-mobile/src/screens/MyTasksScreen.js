import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import Header from '../components/Header';
import { taskService } from '../api';
import { colors } from '../theme';
import { statusMeta, priorityMeta } from '../constants';

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUS_ORDER = { Todo: 0, InProgress: 1, Review: 2, Done: 3 };

export default function MyTasksScreen({ user, nav }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await taskService.getWorkspace();
      const mine = (res.data || [])
        .filter((t) => String(t.userId) === String(user?.id))
        .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      setTasks(mine);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được công việc.');
    }
  }, [user?.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Việc của tôi" subtitle="Công việc được giao cho bạn" />

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
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có công việc nào được giao cho bạn.</Text>}
          renderItem={({ item }) => {
            const st = statusMeta[item.status] || statusMeta.Todo;
            const pr = priorityMeta[item.priority] || priorityMeta.Medium;
            const due = formatDue(item.dueDate);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => nav.push({ name: 'task', task: item, onTaskUpdated: handleTaskUpdated, onTaskDeleted: handleTaskDeleted })}
              >
                <View style={styles.top}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                    <Text style={[styles.badgeText, { color: pr.text }]}>{pr.label}</Text>
                  </View>
                </View>
                {item.projectName ? <Text style={styles.project} numberOfLines={1}>{item.projectName}</Text> : null}
                <View style={styles.bottom}>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                  </View>
                  {due ? <Text style={styles.due}>🕒 {due}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
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
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  project: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  due: { fontSize: 12, color: colors.slate400 },
});
