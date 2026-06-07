import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/betting', label: '投注大厅', icon: '⚽' },
  { path: '/leaderboard', label: '排行榜', icon: '🏆' },
  { path: '/tournament', label: '赛程积分', icon: '📊' },
  { path: '/loan', label: '贷款中心', icon: '🏦' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'vice_admin';

  return (
    <nav className="sticky top-0 z-50 border-b border-primary/30" style={{ background: 'rgba(10, 31, 13, 0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">⚽</span>
            <span className="text-gold font-bold text-lg hidden sm:block">世界杯竞猜 2026</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm no-underline transition-all ${
                  location.pathname === item.path
                    ? 'bg-gold/20 text-gold font-semibold'
                    : 'text-green-200 hover:bg-primary/30 hover:text-white'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm no-underline transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-gold/20 text-gold font-semibold'
                    : 'text-green-200 hover:bg-primary/30 hover:text-white'
                }`}
              >
                <span className="mr-1">⚙️</span>
                <span className="hidden md:inline">管理</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-green-300">{user.username}</div>
                  <div className="text-xs text-gold font-semibold">💰 {user.balance?.toFixed(0)}</div>
                </div>
                <button onClick={logout} className="btn-green text-xs !py-1.5 !px-3">退出</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
