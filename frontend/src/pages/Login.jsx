import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center football-pattern p-4">
      <div className="glass-card gold-glow p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-gold mb-2">世界杯竞猜 2026</h1>
          <p className="text-green-300 text-sm">宋昊峰荣誉出品</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-green-300 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
              placeholder="输入用户名"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-green-300 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              placeholder="输入密码"
              required
            />
          </div>
          {error && <div className="text-danger text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading} className="btn-gold w-full text-lg">
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-green-400 text-sm">还没有账号？</span>
          <Link to="/register" className="text-gold text-sm ml-2 hover:underline">立即注册</Link>
        </div>
      </div>
    </div>
  );
}
