import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Header from '../components/Header';
import { taskService } from '../api';
import { colors } from '../theme';
import { TASK_STATUSES, statusMeta, priorityMeta } from '../constants';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function CreateTaskScreen({ route, nav }) {
  const { projectId, onCreated } = route;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Todo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    setSaving(true); setError('');
    try {
      const res = await taskService.create({
        title: title.trim(),
        description: description.trim(),
        projectId,
        priority,
        status,
        dueDate: null,
      });
      onCreated?.(res.data);
      nav.pop();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Tạo công việc thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Tạo công việc" subtitle="Thêm việc mới vào bảng" onBack={nav.pop} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <Text style={styles.label}>Tiêu đề</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Thiết kế trang chủ"
            placeholderTextColor={colors.slate400}
            editable={!saving}
          />

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả chi tiết (không bắt buộc)"
            placeholderTextColor={colors.slate400}
            multiline
            editable={!saving}
          />

          <Text style={styles.label}>Độ ưu tiên</Text>
          <View style={styles.chips}>
            {PRIORITIES.map((p) => {
              const on = p === priority;
              const meta = priorityMeta[p];
              return (
                <TouchableOpacity key={p} style={[styles.chip, on && { backgroundColor: meta.bg, borderColor: meta.text }]}
                  onPress={() => setPriority(p)} disabled={saving}>
                  <Text style={[styles.chipText, on && { color: meta.text }]}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Trạng thái</Text>
          <View style={styles.chips}>
            {TASK_STATUSES.map((s) => {
              const on = s === status;
              const meta = statusMeta[s];
              return (
                <TouchableOpacity key={s} style={[styles.chip, on && { backgroundColor: meta.color, borderColor: meta.color }]}
                  onPress={() => setStatus(s)} disabled={saving}>
                  <Text style={[styles.chipText, on && { color: colors.white }]}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.submit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Tạo công việc</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  err: { color: colors.rose, fontSize: 13, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: colors.slate700, marginBottom: 8, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.slate900, backgroundColor: colors.white,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: colors.slate300, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.slate700 },
  submit: {
    backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28,
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
