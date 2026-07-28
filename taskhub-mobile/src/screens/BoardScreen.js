import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import Header from '../components/Header';
import { taskService } from '../api';
import { colors } from '../theme';
import { TASK_STATUSES, statusMeta, priorityMeta } from '../constants';

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function BoardScreen({ route, nav }) {
  const { id, projectName } = route;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await taskService.getByProject(id);
      setTasks(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không tải được công việc.');
    }
  }, [id]);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Cập nhật 1 task trong danh sách (gọi từ màn chi tiết sau khi đổi trạng thái).
  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title={projectName || 'Bảng công việc'} subtitle="Công việc theo trạng thái" onBack={nav.pop} />

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
          {TASK_STATUSES.map((status) => {
            const meta = statusMeta[status];
            const items = tasks.filter((t) => t.status === status);
            return (
              <View key={status} style={styles.section}>
                <View style={styles.sectionHead}>
                  <View style={[styles.dot, { backgroundColor: meta.color }]} />
                  <Text style={styles.sectionTitle}>{meta.label}</Text>
                  <View style={styles.countPill}><Text style={styles.countText}>{items.length}</Text></View>
                </View>

                {items.length === 0 ? (
                  <Text style={styles.emptyCol}>Trống</Text>
                ) : (
                  items.map((task) => {
                    const pr = priorityMeta[task.priority] || priorityMeta.Medium;
                    const due = formatDue(task.dueDate);
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.card}
                        activeOpacity={0.8}
                        onPress={() => nav.push({ name: 'task', task, onTaskUpdated: handleTaskUpdated })}
                      >
                        <View style={styles.cardTop}>
                          <Text style={styles.cardTitle} numberOfLines={2}>{task.title}</Text>
                          <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                            <Text style={[styles.badgeText, { color: pr.text }]}>{pr.label}</Text>
                          </View>
                        </View>
                        {task.description ? (
                          <Text style={styles.cardDesc} numberOfLines={2}>{task.description}</Text>
                        ) : null}
                        {due ? <Text style={styles.cardDue}>🕒 {due}</Text> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: colors.rose, textAlign: 'center', marginBottom: 12 },
  retry: { color: colors.brandBlue, fontWeight: '700' },
  section: { marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.slate700 },
  countPill: { backgroundColor: colors.slate200, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, marginLeft: 8 },
  countText: { fontSize: 12, fontWeight: '800', color: colors.slate600 },
  emptyCol: { color: colors.slate400, fontSize: 13, paddingVertical: 8 },
  card: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cardDesc: { fontSize: 13, color: colors.slate500, marginTop: 6 },
  cardDue: { fontSize: 12, color: colors.slate400, marginTop: 8 },
});
