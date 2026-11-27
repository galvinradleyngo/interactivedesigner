import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/edit/:id" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AuthProvider>
  );
}
