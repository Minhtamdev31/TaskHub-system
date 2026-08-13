import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import AiModal from '../components/AiModal';
import { taskService } from '../api';
import { colors } from '../theme';
import { TASK_STATUSES, statusMeta, priorityMeta } from '../constants';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

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
  const onTaskDeleted = route.onTaskDeleted;

  const [task, setTask] = useState(initial);
  const [saving, setSaving] = useState(null); // status đang lưu
  const [savingPr, setSavingPr] = useState(null); // priority đang lưu
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Phân tích AI cho task
  const [aiVisible, setAiVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiUpgrade, setAiUpgrade] = useState(false);

  const openAi = async () => {
    setAiVisible(true); setAiLoading(true); setAiError(''); setAiUpgrade(false); setAiText('');
    try {
      const res = await taskService.aiAnalyze(task.id);
      setAiText(res.data?.analysis || '');
    } catch (e) {
      if (e.response?.data?.requiresUpgrade) setAiUpgrade(true);
      else setAiError(e.response?.data?.message || e.message || 'Không phân tích được.');
    } finally {
      setAiLoading(false);
    }
  };

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

  const changePriority = async (priority) => {
    if (priority === task.priority || savingPr) return;
    setSavingPr(priority);
    setError('');
    try {
      await taskService.update(task.id, { priority });
      const updated = { ...task, priority };
      setTask(updated);
      onTaskUpdated?.(updated);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không cập nhật được độ ưu tiên.');
    } finally {
      setSavingPr(null);
    }
  };

  const handleDelete = () => {
    Alert.alert('Xoá công việc?', task.title, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await taskService.remove(task.id);
            onTaskDeleted?.(task.id);
            nav.pop();
          } catch (e) {
            setDeleting(false);
            Alert.alert('Lỗi', e.response?.data?.message || 'Không xoá được công việc.');
          }
        },
      },
    ]);
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

        <TouchableOpacity style={styles.aiBtn} onPress={openAi} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={16} color="#4338ca" />
          <Text style={styles.aiBtnText}>Phân tích bằng AI</Text>
        </TouchableOpacity>

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

        <View style={styles.block}>
          <Text style={styles.label}>Đổi độ ưu tiên</Text>
          <View style={styles.chips}>
            {PRIORITIES.map((p) => {
              const meta = priorityMeta[p];
              const active = p === task.priority;
              const busy = savingPr === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, active && { backgroundColor: meta.text, borderColor: meta.text }]}
                  onPress={() => changePriority(p)}
                  disabled={!!savingPr}
                  activeOpacity={0.85}
                >
                  {busy ? <ActivityIndicator size="small" color={active ? colors.white : colors.brandBlue} />
                    : <Text style={[styles.chipText, active && { color: colors.white }]}>{meta.label}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting} activeOpacity={0.85}>
          {deleting ? <ActivityIndicator color={colors.rose} /> : <Text style={styles.deleteText}>Xoá công việc</Text>}
        </TouchableOpacity>
      </ScrollView>

      <AiModal
        visible={aiVisible}
        title="Phân tích công việc bằng AI"
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
  aiBtn: {
    marginTop: 16, borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2ff',
    flexDirection: 'row', gap: 8,
  },
  aiBtnText: { color: '#4338ca', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    marginTop: 20, borderWidth: 1, borderColor: '#fecaca', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: colors.roseBg,
  },
  deleteText: { color: colors.rose, fontWeight: '700', fontSize: 15 },
});
