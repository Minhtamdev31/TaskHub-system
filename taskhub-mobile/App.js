import { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getToken, clearToken, authService } from './src/api';
import { colors } from './src/theme';
import TabBar from './src/components/TabBar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import BoardScreen from './src/screens/BoardScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VaultScreen from './src/screens/VaultScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import PricingScreen from './src/screens/PricingScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Màn xác thực khi chưa đăng nhập: 'login' | 'register' | 'forgot'.
  const [authScreen, setAuthScreen] = useState('login');

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

  // Nút back cứng Android: quay lại màn trước (drill-down hoặc màn xác thực).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (user && stack.length > 0) { nav.pop(); return true; }
      if (!user && authScreen !== 'login') { setAuthScreen('login'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [user, stack.length, nav, authScreen]);

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
    let auth;
    if (authScreen === 'register') {
      auth = <RegisterScreen onRegistered={() => setAuthScreen('login')} onGoLogin={() => setAuthScreen('login')} />;
    } else if (authScreen === 'forgot') {
      auth = <ForgotPasswordScreen onDone={() => setAuthScreen('login')} onGoLogin={() => setAuthScreen('login')} />;
    } else {
      auth = (
        <LoginScreen
          onLoggedIn={handleLoggedIn}
          onGoRegister={() => setAuthScreen('register')}
          onGoForgot={() => setAuthScreen('forgot')}
        />
      );
    }
    return (
      <>
        {auth}
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
    else if (top.name === 'createTask') content = <CreateTaskScreen route={top} nav={nav} />;
    else if (top.name === 'budget') content = <BudgetScreen route={top} nav={nav} />;
    else if (top.name === 'pricing') content = <PricingScreen user={user} nav={nav} />;
    else if (top.name === 'checkout') content = <CheckoutScreen route={top} nav={nav} />;
    else if (top.name === 'admin') content = <AdminScreen nav={nav} />;
    else content = <TaskDetailScreen route={top} nav={nav} />;
  } else if (tab === 'mytasks') {
    content = <MyTasksScreen user={user} nav={nav} />;
  } else if (tab === 'dashboard') {
    content = <DashboardScreen user={user} nav={nav} />;
  } else if (tab === 'vault') {
    content = <VaultScreen />;
  } else if (tab === 'profile') {
    content = <ProfileScreen user={user} onLogout={handleLogout} nav={nav} onRefresh={loadProfile} />;
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
