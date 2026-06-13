import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from './MainLayout.jsx';
import { authService } from '../services/api';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const [status, setStatus] = useState('checking'); // checking | allowed | denied

  useEffect(() => {
    if (!token) return;
    authService.getCurrentUser()
      .then((res) => {
        const role = (res.data?.role || '').toLowerCase();
        setStatus(role === 'admin' ? 'allowed' : 'denied');
      })
      .catch(() => setStatus('denied'));
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (status === 'checking') {
    return (
      <MainLayout>
        <div className="p-8 text-slate-500">Đang kiểm tra quyền truy cập...</div>
      </MainLayout>
    );
  }
  if (status === 'denied') return <Navigate to="/dashboard" replace />;
  return <MainLayout>{children}</MainLayout>;
};

export default AdminRoute;
