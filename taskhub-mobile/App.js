import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken, authService } from './src/api';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }
      const res = await authService.me();
      setUser(res.data);
    } catch {
      await clearToken(); // token hỏng/hết hạn -> đăng xuất
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await loadProfile();
      setLoading(false);
    })();
  }, []);

  const handleLoggedIn = async () => {
    setLoading(true);
    await loadProfile();
    setLoading(false);
  };

  const handleLogout = async () => {
    await clearToken();
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandBlue} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      {user
        ? <HomeScreen user={user} onLogout={handleLogout} />
        : <LoginScreen onLoggedIn={handleLoggedIn} />}
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 },
});
