import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import MainLayout from './components/MainLayout.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { ConfirmContainer } from './components/ConfirmDialog.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectListPage from './pages/ProjectListPage.jsx';
import PasswordVaultPage from './pages/PasswordVaultPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProjectBoardPage from './pages/ProjectBoardPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MyTasksPage from './pages/MyTasksPage.jsx';

// Layout dùng chung cho các trang đã đăng nhập. MainLayout (gồm Sidebar) giữ nguyên,
// chỉ phần <Outlet/> đổi khi chuyển trang → Sidebar KHÔNG remount (mượt, không tải lại hồ sơ).
const ProtectedLayout = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <MainLayout><Outlet /></MainLayout>;
};

function App() {
  return (
    <Router>
      <ToastContainer />
      <ConfirmContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/" element={<LandingPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectBoardPage />} />
          <Route path="/vault" element={<PasswordVaultPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Analytics />
    </Router>
  );
}

export default App;
