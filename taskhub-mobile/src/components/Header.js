import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Thanh tiêu đề đơn giản: nút quay lại (tuỳ chọn) + tiêu đề + action bên phải (tuỳ chọn).
export default function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.back} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate200,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { paddingRight: 4 },
  backText: { fontSize: 34, lineHeight: 34, color: colors.brandBlue, fontWeight: '400', marginTop: -4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.slate900 },
  subtitle: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  right: { marginLeft: 8 },
});
