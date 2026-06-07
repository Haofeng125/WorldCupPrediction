import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('两次密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register(username, password, passwordConfirm, invitationCode);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center football-pattern p-4">
      <div className="glass-card gold-glow p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌟</div>
          <h1 className="text-3xl font-bold text-gold mb-2">加入竞猜</h1>
          <p className="text-green-300 text-sm">没有邀请码？那你不是我朋友</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-green-300 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
              placeholder="给自己取个酷名字"
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
              placeholder="设置密码（至少4位）"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-green-300 mb-1">确认密码</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full"
              placeholder="再输入一次密码"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-green-300 mb-1">邀请码</label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className="w-full"
              placeholder="输入邀请码"
              required
            />
          </div>
          {error && <div className="text-danger text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading} className="btn-gold w-full text-lg">
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-green-400 text-sm">已有账号？</span>
          <Link to="/login" className="text-gold text-sm ml-2 hover:underline">去登录</Link>
        </div>
      </div>
    </div>
  );
}
