import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Thanh điều hướng dưới cùng, dùng emoji làm icon (không cần thư viện icon).
const TABS = [
  { key: 'projects', label: 'Dự án', icon: '📁' },
  { key: 'mytasks', label: 'Việc của tôi', icon: '✔️' },
  { key: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { key: 'profile', label: 'Hồ sơ', icon: '👤' },
];

export default function TabBar({ active, onChange }) {
  return (
    <View style={styles.wrap}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => onChange(t.key)} activeOpacity={0.7}>
            <Text style={[styles.icon, { opacity: on ? 1 : 0.45 }]}>{t.icon}</Text>
            <Text style={[styles.label, on && styles.labelActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.slate200,
    paddingBottom: 22, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  icon: { fontSize: 20 },
  label: { fontSize: 11, color: colors.slate400, fontWeight: '600' },
  labelActive: { color: colors.brandBlue },
});
