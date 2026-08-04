import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import Header from '../components/Header';
import { subscriptionService, paymentService, API_BASE } from '../api';
import { colors } from '../theme';
import { formatVnd } from '../constants';

export default function PricingScreen({ user, nav }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const isPremium = !!user?.subscription?.isPremium;

  useEffect(() => {
    (async () => {
      try {
        const res = await subscriptionService.getPlans();
        setPlans(res.data || []);
      } catch { /* để danh sách rỗng */ }
      setLoading(false);
    })();
  }, []);

  const upgrade = async (plan) => {
    setBusy(plan.id); setError('');
    try {
      const res = await paymentService.checkoutPayOS({
        planId: plan.id,
        returnUrl: `${API_BASE}/`,
        cancelUrl: `${API_BASE}/`,
      });
      const url = res.data?.checkoutUrl;
      if (url) {
        await Linking.openURL(url); // mở trang thanh toán PayOS trong trình duyệt
      } else {
        setError('Không tạo được liên kết thanh toán.');
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Không bắt đầu được thanh toán.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      <Header title="Nâng cấp Premium" onBack={nav.pop} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandBlue} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {isPremium ? (
            <View style={styles.premiumBox}>
              <Text style={styles.premiumText}>👑 Bạn đang dùng gói Premium</Text>
            </View>
          ) : null}

          <Text style={styles.intro}>Mở khoá Kho mật khẩu, nhắc deadline, phân tích AI và nhiều tính năng khác.</Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}

          {plans.length === 0 ? (
            <Text style={styles.empty}>Chưa có gói nào khả dụng.</Text>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={styles.card}>
                <Text style={styles.planTitle}>{plan.title || plan.name}</Text>
                <Text style={styles.price}>
                  {formatVnd(plan.price)}
                  <Text style={styles.duration}> / {plan.durationDays} ngày</Text>
                </Text>
                {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
                <TouchableOpacity
                  style={[styles.btn, busy === plan.id && { opacity: 0.6 }]}
                  onPress={() => upgrade(plan)}
                  disabled={!!busy}
                  activeOpacity={0.85}
                >
                  {busy === plan.id
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={styles.btnText}>Nâng cấp ngay</Text>}
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.note}>
            Bấm "Nâng cấp ngay" sẽ mở trang thanh toán PayOS trong trình duyệt. Sau khi thanh toán xong, quay lại app và kéo làm mới ở tab Hồ sơ để thấy trạng thái Premium.
          </Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  premiumBox: { backgroundColor: '#ecfdf5', borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', padding: 14, marginBottom: 16 },
  premiumText: { color: '#047857', fontWeight: '800', textAlign: 'center' },
  intro: { fontSize: 14, color: colors.slate500, marginBottom: 16, lineHeight: 20 },
  err: { color: colors.rose, marginBottom: 12 },
  empty: { color: colors.slate400, textAlign: 'center', marginTop: 20 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.slate200,
    padding: 18, marginBottom: 14,
  },
  planTitle: { fontSize: 17, fontWeight: '800', color: colors.slate900 },
  price: { fontSize: 24, fontWeight: '800', color: colors.slate900, marginTop: 6 },
  duration: { fontSize: 14, fontWeight: '500', color: colors.slate400 },
  desc: { fontSize: 14, color: colors.slate500, marginTop: 6, lineHeight: 20 },
  btn: { backgroundColor: colors.brandBlue, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  note: { fontSize: 12, color: colors.slate400, marginTop: 8, lineHeight: 18 },
});
