import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// Icon vector (giống web) thay cho emoji.
const TABS = [
  { key: 'projects', label: 'Dự án', on: 'folder', off: 'folder-outline' },
  { key: 'mytasks', label: 'Việc', on: 'checkmark-done', off: 'checkmark-done-outline' },
  { key: 'dashboard', label: 'Tổng quan', on: 'stats-chart', off: 'stats-chart-outline' },
  { key: 'vault', label: 'Kho MK', on: 'lock-closed', off: 'lock-closed-outline' },
  { key: 'profile', label: 'Hồ sơ', on: 'person', off: 'person-outline' },
];

export default function TabBar({ active, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onChange(t.key)} activeOpacity={0.7}>
            <Ionicons name={on ? t.on : t.off} size={22} color={on ? colors.brandBlue : colors.slate400} />
            <Text style={[styles.label, on && styles.labelActive]} numberOfLines={1}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.slate200, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  label: { fontSize: 10.5, color: colors.slate400, fontWeight: '600' },
  labelActive: { color: colors.brandBlue },
});
