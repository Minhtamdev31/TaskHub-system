import { useRef, useState } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Header from '../components/Header';
import { colors } from '../theme';
import { API_BASE } from '../api';

// Nhúng trang thanh toán PayOS (có mã QR + số tiền + trạng thái) ngay trong app.
export default function CheckoutScreen({ route, nav }) {
  const { url } = route;
  const [loading, setLoading] = useState(true);
  const handled = useRef(false);

  // PayOS sẽ điều hướng về returnUrl/cancelUrl (API_BASE?status=...) khi xong.
  const onNav = (navState) => {
    const u = navState.url || '';
    if (handled.current) return;
    if (u.startsWith(API_BASE) && (u.includes('status=success') || u.includes('status=cancel'))) {
      handled.current = true;
      const ok = u.includes('status=success');
      nav.pop();
      Alert.alert(
        ok ? 'Đã ghi nhận thanh toán' : 'Đã huỷ thanh toán',
        ok
          ? 'Premium sẽ được kích hoạt sau giây lát. Vào tab Hồ sơ và kéo xuống làm mới để cập nhật.'
          : 'Bạn đã huỷ giao dịch này.'
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Header title="Thanh toán" subtitle="Quét mã QR bằng app ngân hàng" onBack={nav.pop} />
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={onNav}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState
      />
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.brandBlue} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute', left: 0, right: 0, top: 90, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
});
