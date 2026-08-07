import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Modal hiển thị kết quả AI (dùng chung cho Dashboard / Task / Board).
export default function AiModal({ visible, title, loading, text, error, upgrade, onClose, onRetry }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <View style={styles.chip}><Text style={styles.chipText}>✨</Text></View>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ padding: 18 }}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.brandBlue} />
                <Text style={styles.hint}>AI đang đọc & phân tích…</Text>
              </View>
            ) : upgrade ? (
              <View style={styles.center}>
                <Text style={styles.upgradeTitle}>Tính năng AI dành cho Premium</Text>
                <Text style={styles.upgradeSub}>Nâng cấp Premium (tab Hồ sơ) để dùng tóm tắt & phân tích bằng AI.</Text>
              </View>
            ) : error ? (
              <Text style={styles.err}>{error}</Text>
            ) : (
              <Text style={styles.body}>{text || 'Không có nội dung.'}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {!loading && !upgrade ? (
              <TouchableOpacity onPress={onRetry}><Text style={styles.retry}>Tạo lại</Text></TouchableOpacity>
            ) : <View />}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  chip: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16 },
  title: { fontSize: 17, fontWeight: '800', color: colors.slate900, flex: 1 },
  close: { fontSize: 18, color: colors.slate400, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  hint: { color: colors.slate500, marginTop: 12, fontSize: 14 },
  upgradeTitle: { fontSize: 16, fontWeight: '800', color: colors.slate900 },
  upgradeSub: { fontSize: 14, color: colors.slate500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  err: { color: colors.rose, fontSize: 14 },
  body: { color: colors.slate700, fontSize: 15, lineHeight: 23 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.slate100, paddingBottom: 26,
  },
  retry: { color: colors.slate500, fontWeight: '700', fontSize: 14 },
  closeBtn: { backgroundColor: colors.brandBlue, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  closeBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
