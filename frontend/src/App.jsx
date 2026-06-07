import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Betting from './pages/Betting';
import Leaderboard from './pages/Leaderboard';
import Tournament from './pages/Tournament';
import Loan from './pages/Loan';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-300">加载中...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-300">加载中...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin' && user.role !== 'vice_admin') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Navbar /><Home /></ProtectedRoute>} />
      <Route path="/betting" element={<ProtectedRoute><Navbar /><Betting /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Navbar /><Leaderboard /></ProtectedRoute>} />
      <Route path="/tournament" element={<ProtectedRoute><Navbar /><Tournament /></ProtectedRoute>} />
      <Route path="/loan" element={<ProtectedRoute><Navbar /><Loan /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Navbar /><Admin /></AdminRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
