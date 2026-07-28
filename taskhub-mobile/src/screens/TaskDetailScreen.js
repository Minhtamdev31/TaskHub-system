import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Header from '../components/Header';
import { taskService } from '../api';
import { colors } from '../theme';
import { TASK_STATUSES, statusMeta, priorityMeta } from '../constants';

const formatDue = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TaskDetailScreen({ route, nav }) {
  const initial = route.task;
  const onTaskUpdated = route.onTaskUpdated;

  const [task, setTask] = useState(initial);
  const [saving, setSaving] = useState(null); // status đang lưu
  const [error, setError] = useState('');

  const pr = priorityMeta[task.priority] || priorityMeta.Medium;

  const changeStatus = async (status) => {
    if (status === task.status || saving) return;
    setSaving(status);
    setError('');
    try {
      await taskService.update(task.id, { status });
      const updated = { ...task, status };
      setTask(updated);
      onTaskUpdated?.(updated);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không cập nhật được trạng thái.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Chi tiết công việc" onBack={nav.pop} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: pr.bg }]}>
            <Text style={[styles.badgeText, { color: pr.text }]}>{pr.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusMeta[task.status]?.bg || colors.slate100 }]}>
            <Text style={[styles.badgeText, { color: statusMeta[task.status]?.text || colors.slate600 }]}>
              {statusMeta[task.status]?.label || task.status}
            </Text>
          </View>
        </View>

        {task.description ? (
          <View style={styles.block}>
            <Text style={styles.label}>Mô tả</Text>
            <Text style={styles.body}>{task.description}</Text>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.label}>Hạn chót</Text>
          <Text style={styles.body}>{formatDue(task.dueDate)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Đổi trạng thái</Text>
          <View style={styles.chips}>
            {TASK_STATUSES.map((s) => {
              const meta = statusMeta[s];
              const active = s === task.status;
              const busy = saving === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                  onPress={() => changeStatus(s)}
                  disabled={!!saving}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={active ? colors.white : colors.brandBlue} />
                  ) : (
                    <Text style={[styles.chipText, active && { color: colors.white }]}>{meta.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.slate900 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  block: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.slate200,
    padding: 16, marginTop: 16,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.slate500, marginBottom: 8 },
  body: { fontSize: 15, color: colors.slate700, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 84, alignItems: 'center', backgroundColor: colors.white,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  err: { color: colors.rose, marginTop: 10, fontSize: 13 },
});
