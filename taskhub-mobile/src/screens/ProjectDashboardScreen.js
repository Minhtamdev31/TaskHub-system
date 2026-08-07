import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import Header from '../components/Header';
import { projectService, taskService } from '../api';
import { colors } from '../theme';
import { statusMeta } from '../constants';

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const round = (n) => Math.round(Number(n) || 0);

export default function ProjectDashboardScreen({ route, nav }) {
  const { id, projectName } = route;
  const [dash, setDash] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(false);

  const load = useCallback(async () => {
    setError(''); setUpgrade(false);
    try {
      const [dRes, mRes, tRes] = await Promise.all([
        projectService.getDashboard(id),
        projectService.memberContributions(id).catch(() => ({ data: [] })),
        taskService.getByProject(id).catch(() => ({ data: [] })),
      ]);
      setDash(dRes.data);
      setMembers((mRes.data || []).slice().sort((a, b) => (b.contributionPercentage || 0) - (a.contributionPercentage || 0)));
      setTasks(tRes.data || []);
    } catch (e) {
      if (e.response?.data?.requiresUpgrade) setUpgrade(true);
      else setError(e.response?.data?.message || e.message || 'Không tải được tổng quan dự án.');
    }
  }, [id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const d = dash || {};
  const pct = round(d.completionPercentage);

  const nameMap = {};
  members.forEach((m) => { nameMap[m.userId] = m.username || m.email; });
  const nameOf = (uid) => (uid ? (nameMap[uid] || '—') : '—');
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const statusTiles = [
    { label: 'Cần làm', count: d.todoCount ?? 0, meta: statusMeta.Todo },
    { label: 'Đang làm', count: d.inProgressCount ?? 0, meta: statusMeta.InProgress },
    { label: 'Xem xét', count: d.reviewCount ?? 0, meta: statusMeta.Review },
    { label: 'Hoàn thành', count: d.doneCount ?? 0, meta: statusMeta.Done },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Tổng quan dự án" subtitle={projectName} onBack={nav.pop} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : upgrade ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📊</Text>
          <Text style={styles.upTitle}>Tổng quan dự án là tính năng Premium</Text>
          <Text style={styles.upSub}>Nâng cấp Premium để theo dõi tiến độ dự án và mức đóng góp của từng thành viên.</Text>
          <TouchableOpacity style={styles.upBtn} onPress={() => nav.push({ name: 'pricing' })} activeOpacity={0.85}>
            <Text style={styles.upBtnText}>Nâng cấp Premium</Text>
          </TouchableOpacity>
        </View>
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
          {/* Tiến độ tổng */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.progressLabel}>Tiến độ hoàn thành</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <View style={styles.totalBox}>
                <Text style={styles.totalNum}>{d.totalTasks ?? 0}</Text>
                <Text style={styles.totalLabel}>công việc</Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, pct)}%` }]} />
            </View>
            {(d.overdueTasksCount ?? 0) > 0 ? (
              <Text style={styles.overdue}>⚠️ {d.overdueTasksCount} công việc quá hạn</Text>
            ) : (
              <Text style={styles.ontrack}>✓ Không có công việc quá hạn</Text>
            )}
          </View>

          {/* Phân bố trạng thái */}
          <Text style={styles.section}>Theo trạng thái</Text>
          <View style={styles.tiles}>
            {statusTiles.map((t) => (
              <View key={t.label} style={styles.tile}>
                <View style={[styles.dot, { backgroundColor: t.meta.color }]} />
                <Text style={styles.tileCount}>{t.count}</Text>
                <Text style={styles.tileLabel}>{t.label}</Text>
              </View>
            ))}
          </View>

          {/* Đóng góp thành viên */}
          <Text style={styles.section}>Thành viên ({members.length})</Text>
          {members.length === 0 ? (
            <Text style={styles.empty}>Chưa có dữ liệu thành viên.</Text>
          ) : (
            members.map((m) => {
              const cpct = round(m.contributionPercentage);
              return (
                <View key={m.userId} style={styles.memberCard}>
                  <View style={styles.memberTop}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{initials(m.username)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName} numberOfLines={1}>{m.username || m.email}</Text>
                      <Text style={styles.memberMeta}>Được giao {m.totalAssignedTasks ?? 0} việc</Text>
                    </View>
                    <Text style={styles.contribPct}>{cpct}%</Text>
                  </View>

                  <View style={styles.mTrack}>
                    <View style={[styles.mFill, { width: `${Math.min(100, cpct)}%` }]} />
                  </View>

                  <View style={styles.mStats}>
                    <MStat label="Xong" value={m.completedTasks ?? 0} color={colors.emerald} />
                    <MStat label="Đang làm" value={m.inProgressTasks ?? 0} color={colors.brandBlue} />
                    <MStat label="Quá hạn" value={m.overdueTasks ?? 0} color={colors.rose} />
                  </View>
                </View>
              );
            })
          )}

          <Text style={styles.section}>Công việc mới tạo</Text>
          {recentTasks.length === 0 ? (
            <Text style={styles.empty}>Chưa có công việc.</Text>
          ) : (
            recentTasks.map((t) => {
              const st = statusMeta[t.status] || statusMeta.Todo;
              return (
                <View key={t.id} style={styles.taskRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.taskMeta} numberOfLines={1}>Tạo: {nameOf(t.createdById)} · Giao: {nameOf(t.userId)}</Text>
                    <Text style={styles.taskDate}>{fmtDate(t.createdAt)}</Text>
                  </View>
                  <View style={[styles.taskBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.taskBadgeText, { color: st.text }]}>{st.label}</Text>
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

function MStat({ label, value, color }) {
  return (
    <View style={styles.mStat}>
      <Text style={[styles.mStatNum, { color }]}>{value}</Text>
      <Text style={styles.mStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: colors.rose, textAlign: 'center' },
  retry: { color: colors.brandBlue, fontWeight: '700', marginTop: 8 },
  empty: { color: colors.slate400 },
  upTitle: { fontSize: 18, fontWeight: '800', color: colors.slate900, textAlign: 'center' },
  upSub: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  upBtn: { marginTop: 20, backgroundColor: colors.brandBlue, borderRadius: 12, paddingHorizontal: 26, paddingVertical: 13 },
  upBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  progressCard: {
    backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.slate200, padding: 18,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressLabel: { fontSize: 13, color: colors.slate500, fontWeight: '600' },
  progressPct: { fontSize: 40, fontWeight: '800', color: colors.slate900, marginTop: 2 },
  totalBox: { alignItems: 'flex-end' },
  totalNum: { fontSize: 26, fontWeight: '800', color: colors.brandBlue },
  totalLabel: { fontSize: 12, color: colors.slate400 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.slate200, marginTop: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.emerald },
  overdue: { color: colors.rose, fontWeight: '700', fontSize: 13, marginTop: 10 },
  ontrack: { color: colors.emerald, fontWeight: '700', fontSize: 13, marginTop: 10 },
  section: { fontSize: 16, fontWeight: '800', color: colors.slate900, marginTop: 24, marginBottom: 12 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    paddingVertical: 12, alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  tileCount: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  tileLabel: { fontSize: 10.5, color: colors.slate500, marginTop: 2, fontWeight: '600' },
  memberCard: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200, padding: 14, marginBottom: 10,
  },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandBlue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  memberMeta: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  contribPct: { fontSize: 18, fontWeight: '800', color: colors.brandBlue },
  mTrack: { height: 6, borderRadius: 3, backgroundColor: colors.slate100, marginTop: 12, overflow: 'hidden' },
  mFill: { height: '100%', borderRadius: 3, backgroundColor: colors.brandBlue },
  mStats: { flexDirection: 'row', marginTop: 12 },
  mStat: { flex: 1, alignItems: 'center' },
  mStatNum: { fontSize: 18, fontWeight: '800' },
  mStatLabel: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: colors.slate200, padding: 12, marginBottom: 8,
  },
  taskTitle: { fontSize: 14, fontWeight: '700', color: colors.slate900 },
  taskMeta: { fontSize: 12, color: colors.slate500, marginTop: 3 },
  taskDate: { fontSize: 11, color: colors.slate400, marginTop: 2 },
  taskBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  taskBadgeText: { fontSize: 11, fontWeight: '800' },
});
