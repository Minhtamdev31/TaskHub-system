import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
// nút tạo dùng chữ, không cần thư viện icon
import { HubConnectionBuilder } from '@microsoft/signalr';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import AiModal from '../components/AiModal';
import { taskService, projectService, getToken } from '../api';
import { colors } from '../theme';
import { TASK_STATUSES, statusMeta, priorityMeta } from '../constants';

// Hub realtime luôn chạy trên Render (kết nối thẳng, không qua /api).
const HUB_URL = 'https://taskhub-system.onrender.com/hubs/project';

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

  // Tóm tắt AI cho dự án
  const [aiVisible, setAiVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiUpgrade, setAiUpgrade] = useState(false);

  const openAi = async () => {
    setAiVisible(true); setAiLoading(true); setAiError(''); setAiUpgrade(false); setAiText('');
    try {
      const res = await projectService.aiSummary(id);
      setAiText(res.data?.summary || '');
    } catch (e) {
      if (e.response?.data?.requiresUpgrade) setAiUpgrade(true);
      else setAiError(e.response?.data?.message || e.message || 'Không tạo được tóm tắt.');
    } finally { setAiLoading(false); }
  };

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

  // Realtime: tự tải lại bảng khi có thay đổi trong dự án (task/comment).
  // Nếu hub chưa sẵn sàng hoặc lỗi, bảng vẫn dùng được nhờ kéo làm mới.
  useEffect(() => {
    let connection;
    let stopped = false;
    (async () => {
      try {
        connection = new HubConnectionBuilder()
          .withUrl(HUB_URL, { accessTokenFactory: async () => (await getToken()) || '' })
          .withAutomaticReconnect()
          .build();
        connection.on('projectChanged', () => { load(); });
        await connection.start();
        if (!stopped) await connection.invoke('JoinProject', id);
        connection.onreconnected(() => { connection.invoke('JoinProject', id).catch(() => {}); });
      } catch { /* im lặng */ }
    })();
    return () => { stopped = true; if (connection) connection.stop().catch(() => {}); };
  }, [id, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Cập nhật 1 task trong danh sách (gọi từ màn chi tiết sau khi đổi trạng thái).
  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  // Thêm task mới (gọi từ màn Tạo công việc).
  const handleCreated = (task) => {
    if (task) setTasks((prev) => [...prev, task]);
  };

  // Bỏ task khỏi bảng khi bị xoá ở màn chi tiết.
  const handleDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header
        title={projectName || 'Bảng công việc'}
        subtitle="Công việc theo trạng thái"
        onBack={nav.pop}
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={openAi} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="sparkles" size={21} color={colors.brandBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.push({ name: 'createTask', projectId: id, onCreated: handleCreated })}>
              <Text style={styles.addBtn}>＋ Tạo</Text>
            </TouchableOpacity>
          </View>
        )}
      />

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
          <TouchableOpacity
            style={styles.budgetLink}
            activeOpacity={0.85}
            onPress={() => nav.push({ name: 'projectDashboard', id, projectName })}
          >
            <Text style={styles.budgetText}>📊  Tổng quan dự án</Text>
            <Text style={styles.budgetChev}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.budgetLink}
            activeOpacity={0.85}
            onPress={() => nav.push({ name: 'budget', projectId: id, projectName })}
          >
            <Text style={styles.budgetText}>💰  Ngân sách dự án</Text>
            <Text style={styles.budgetChev}>›</Text>
          </TouchableOpacity>

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
                        onPress={() => nav.push({ name: 'task', task, onTaskUpdated: handleTaskUpdated, onTaskDeleted: handleDeleted })}
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

      <AiModal
        visible={aiVisible}
        title="Tóm tắt dự án bằng AI"
        loading={aiLoading}
        text={aiText}
        error={aiError}
        upgrade={aiUpgrade}
        onClose={() => setAiVisible(false)}
        onRetry={openAi}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: colors.rose, textAlign: 'center', marginBottom: 12 },
  retry: { color: colors.brandBlue, fontWeight: '700' },
  addBtn: { color: colors.brandBlue, fontWeight: '800', fontSize: 15 },
  budgetLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  budgetText: { fontSize: 15, fontWeight: '700', color: colors.slate700 },
  budgetChev: { fontSize: 22, color: colors.slate300 },
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
