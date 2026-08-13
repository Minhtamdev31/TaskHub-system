import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
// (chuông thông báo dùng emoji, không cần thư viện icon)
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import AiModal from '../components/AiModal';
import { taskService } from '../api';
import { colors, gradients } from '../theme';
import { priorityMeta } from '../constants';

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function StatCard({ label, value, grad, icon }) {
  return (
    <View style={styles.stat}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statBar} />
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statChip}>
          <Text style={styles.statIcon}>{icon}</Text>
        </LinearGradient>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen({ user, nav }) {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tóm tắt AI
  const [aiVisible, setAiVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiUpgrade, setAiUpgrade] = useState(false);

  const openAi = async () => {
    setAiVisible(true); setAiLoading(true); setAiError(''); setAiUpgrade(false); setAiText('');
    try {
      const res = await taskService.aiMyWork();
      setAiText(res.data?.summary || '');
    } catch (e) {
      if (e.response?.data?.requiresUpgrade) setAiUpgrade(true);
      else setAiError(e.response?.data?.message || e.message || 'Không tạo được tóm tắt.');
    } finally {
      setAiLoading(false);
    }
  };

  const load = useCallback(async () => {
    const now = Date.now();
    const [sRes, wRes] = await Promise.all([
      taskService.getDashboardStats().catch(() => ({ data: null })),
      taskService.getWorkspace().catch(() => ({ data: [] })),
    ]);
    setStats(sRes.data);
    const up = (wRes.data || [])
      .filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    setUpcoming(up);
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const name = user?.profile?.fullName || user?.username || 'bạn';
  const s = stats || {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header
        title={`Chào, ${name}`}
        subtitle="Tổng quan công việc"
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={openAi} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="sparkles" size={22} color={colors.brandBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.push({ name: 'notifications' })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="notifications-outline" size={22} color={colors.slate600} />
            </TouchableOpacity>
          </View>
        )}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
        >
          <View style={styles.grid}>
            <StatCard label="Tổng công việc" value={s.totalTasks ?? 0} grad={gradients.blue} icon="📋" />
            <StatCard label="Hoàn thành" value={s.completedTasks ?? 0} grad={gradients.emerald} icon="✅" />
            <StatCard label="Đang làm" value={s.inProgressTasks ?? 0} grad={gradients.amber} icon="⏳" />
            <StatCard label="Quá hạn" value={s.overdueTasks ?? 0} grad={gradients.rose} icon="⚠️" />
          </View>

          <Text style={styles.sectionTitle}>Sắp đến hạn</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.empty}>Không có công việc nào sắp đến hạn.</Text>
          ) : (
            upcoming.map((t) => {
              const pr = priorityMeta[t.priority] || priorityMeta.Medium;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => nav.push({ name: 'task', task: t, onTaskUpdated: () => {} })}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{t.title}</Text>
                    <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                      <Text style={[styles.badgeText, { color: pr.text }]}>{pr.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {t.projectName ? `${t.projectName} · ` : ''}🕒 {formatDue(t.dueDate)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <AiModal
        visible={aiVisible}
        title="Tóm tắt công việc bằng AI"
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: {
    width: '47%', flexGrow: 1, backgroundColor: colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: colors.slate200, padding: 16, overflow: 'hidden',
    shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  statChip: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 15 },
  statLabel: { fontSize: 13, color: colors.slate500, fontWeight: '600', flex: 1, paddingRight: 6 },
  statValue: { fontSize: 30, fontWeight: '800', color: colors.slate900, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.slate900, marginTop: 24, marginBottom: 12 },
  empty: { color: colors.slate400, fontSize: 14 },
  card: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 14, marginBottom: 10,
    shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.slate900 },
  cardMeta: { fontSize: 12, color: colors.slate400, marginTop: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
});
