import { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken, authService } from './src/api';
import { colors } from './src/theme';
import TabBar from './src/components/TabBar';
import LoginScreen from './src/screens/LoginScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import BoardScreen from './src/screens/BoardScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VaultScreen from './src/screens/VaultScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Tab đang chọn + ngăn xếp drill-down (Board/Task) nằm trên tab đó.
  const [tab, setTab] = useState('projects');
  const [stack, setStack] = useState([]);

  const nav = useMemo(() => ({
    push: (screen) => setStack((s) => [...s, screen]),
    pop: () => setStack((s) => s.slice(0, -1)),
  }), []);

  const switchTab = (t) => { setTab(t); setStack([]); };

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

  // Nút back cứng Android: quay lại nếu đang ở màn drill-down.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (user && stack.length > 0) { nav.pop(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [user, stack.length, nav]);

  const handleLoggedIn = async () => {
    setLoading(true);
    await loadProfile();
    setTab('projects');
    setStack([]);
    setLoading(false);
  };

  const handleLogout = async () => {
    await clearToken();
    setUser(null);
    setTab('projects');
    setStack([]);
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

  const drilled = stack.length > 0;
  let content;
  if (drilled) {
    const top = stack[stack.length - 1];
    if (top.name === 'board') content = <BoardScreen route={top} nav={nav} />;
    else if (top.name === 'notifications') content = <NotificationsScreen nav={nav} />;
    else content = <TaskDetailScreen route={top} nav={nav} />;
  } else if (tab === 'mytasks') {
    content = <MyTasksScreen user={user} nav={nav} />;
  } else if (tab === 'dashboard') {
    content = <DashboardScreen user={user} nav={nav} />;
  } else if (tab === 'vault') {
    content = <VaultScreen />;
  } else if (tab === 'profile') {
    content = <ProfileScreen user={user} onLogout={handleLogout} />;
  } else {
    content = <ProjectsScreen user={user} nav={nav} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
      {content}
      {!drilled ? <TabBar active={tab} onChange={switchTab} /> : null}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 },
});
