import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '⚽', title: '多规则竞猜', desc: '猜胜负、猜出线、猜冠军' },
  { icon: '📊', title: '实时排行榜', desc: '谁是最懂球？谁是球盲？' },
  { icon: '🏦', title: '破产救济金', desc: '输光了还能借，不坑穷人' },
  { icon: '🏆', title: '赛程追踪器', desc: '实时更新对阵和积分' },
];

const RULES = [
  { num: '1', text: '注册就送 10,000 虚拟币，白嫖的钱不心疼' },
  { num: '2', text: '在投注大厅挑你觉得稳的比赛，梭哈！' },
  { num: '3', text: '单次最多押余额的 50%，庄家（我）怕你赢太多' },
  { num: '4', text: '猜对了按赔率发钱，猜错了...别看我' },
  { num: '5', text: '输光了可以找银行借钱，每阶段最多借3次' },
  { num: '6', text: '余额超过 10,000 自动还贷，别想赖账' },
  { num: '7', text: '排行榜决定谁请客吃饭（不是' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="football-pattern min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center relative">
          <div className="text-8xl mb-6 animate-fade-in">⚽</div>
          <h1 className="text-5xl md:text-6xl font-bold text-gold mb-4 animate-fade-in">
            世界杯竞猜 2026
          </h1>
          <p className="text-xl text-green-200 mb-2 animate-fade-in">
            🇺🇸 美国 · 🇨🇦 加拿大 · 🇲🇽 墨西哥
          </p>
          <p className="text-green-300 mb-2 animate-fade-in">
            宋昊峰是爷爷
          </p>
          <p className="text-green-400 text-sm mb-8 animate-fade-in">
            左岛屹是孙子
          </p>
          <div className="flex gap-4 justify-center animate-fade-in">
            <Link to="/betting" className="btn-gold text-lg !px-8 !py-3 no-underline">
              🎯 开始竞猜
            </Link>
            <Link to="/leaderboard" className="btn-green text-lg !px-8 !py-3 no-underline">
              🏆 排行榜
            </Link>
          </div>
          {user && (
            <div className="mt-8 glass-card inline-block px-8 py-4 gold-glow">
              <span className="text-green-300">欢迎回来，</span>
              <span className="text-gold font-bold">{user.username}</span>
              <span className="text-green-300 mx-3">|</span>
              <span className="text-green-300">余额：</span>
              <span className="text-gold font-bold text-xl">💰 {user.balance?.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center text-gold mb-10">🎮 游戏特色</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card p-6 text-center hover:border-gold/30 transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-green-300 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center text-gold mb-10">📜 游戏规则</h2>
        <div className="glass-card p-8">
          <div className="space-y-4">
            {RULES.map((r) => (
              <div key={r.num} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                  {r.num}
                </div>
                <p className="text-green-200 pt-1">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-12">
        <div className="glass-card inline-block px-12 py-8 gold-glow">
          <div className="text-4xl mb-4">🏟️</div>
          <p className="text-green-200 mb-4">今天能赢吗？</p>
          <Link to="/betting" className="btn-gold text-lg !px-8 no-underline">下注</Link>
        </div>
      </div>
    </div>
  );
}
