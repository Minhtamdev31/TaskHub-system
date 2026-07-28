import { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken, authService } from './src/api';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import BoardScreen from './src/screens/BoardScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Ngăn xếp điều hướng đơn giản bằng state (không cần thư viện navigation).
  const [stack, setStack] = useState([{ name: 'projects' }]);
  const nav = useMemo(() => ({
    push: (screen) => setStack((s) => [...s, screen]),
    pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    reset: () => setStack([{ name: 'projects' }]),
  }), []);
  const current = stack[stack.length - 1];

  const loadProfile = async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }
      const res = await authService.me();
      setUser(res.data);
    } catch {
      await clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => { await loadProfile(); setLoading(false); })();
  }, []);

  // Nút back cứng của Android: quay lại màn trước nếu còn trong ngăn xếp.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (user && stack.length > 1) { nav.pop(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [user, stack.length, nav]);

  const handleLoggedIn = async () => {
    setLoading(true);
    await loadProfile();
    nav.reset();
    setLoading(false);
  };

  const handleLogout = async () => {
    await clearToken();
    setUser(null);
    nav.reset();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandBlue} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLoggedIn={handleLoggedIn} />
        <StatusBar style="dark" />
      </>
    );
  }

  let screen;
  if (current.name === 'board') {
    screen = <BoardScreen route={current} nav={nav} />;
  } else if (current.name === 'task') {
    screen = <TaskDetailScreen route={current} nav={nav} />;
  } else {
    screen = <ProjectsScreen user={user} onLogout={handleLogout} nav={nav} />;
  }

  return (
    <>
      {screen}
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 },
});
