import { useState, useEffect } from 'react';
import api from '../api';
import TabBar from '../components/TabBar';

const TABS = [
  { key: 'total', label: '总资产', icon: '💰' },
  { key: 'balance', label: '可用资金', icon: '💵' },
  { key: 'accuracy', label: '胜率', icon: '🎯' },
  { key: 'weekly', label: '本周盈亏', icon: '📈' },
];

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [tab, setTab] = useState('total');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoints = {
        total: '/leaderboard/total-assets',
        balance: '/leaderboard/balance',
        accuracy: '/leaderboard/accuracy',
        weekly: '/leaderboard/weekly',
      };
      const res = await api.get(endpoints[tab]);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 football-pattern min-h-screen">
      <h1 className="text-3xl font-bold text-gold mb-6 text-center">🏆 排行榜</h1>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <div className="text-center py-12 text-green-300">加载中...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-green-400">
          <div className="text-4xl mb-4">📊</div>
          <p>暂无数据</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden animate-fade-in">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/30">
                <th className="px-4 py-3 text-left text-sm text-green-400 font-semibold">排名</th>
                <th className="px-4 py-3 text-left text-sm text-green-400 font-semibold">玩家</th>
                {tab === 'total' && (
                  <>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">余额</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">在投</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">贷款</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold">总资产</th>
                  </>
                )}
                {tab === 'balance' && (
                  <>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">余额</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">在投</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold">可用资金</th>
                  </>
                )}
                {tab === 'accuracy' && (
                  <>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">总投注</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold hidden sm:table-cell">猜对</th>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold">胜率</th>
                  </>
                )}
                {tab === 'weekly' && (
                  <>
                    <th className="px-4 py-3 text-right text-sm text-green-400 font-semibold">本周盈亏</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className={`border-b border-primary/10 transition-colors hover:bg-primary/20 ${i < 3 ? 'bg-gold/5' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-lg">{RANK_ICONS[i] || <span className="text-green-400 text-sm font-mono">{item.rank}</span>}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{item.username}</td>

                  {tab === 'total' && (
                    <>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.balance?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.active_bets?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-danger hidden sm:table-cell">{item.outstanding_loan > 0 ? `-${item.outstanding_loan?.toFixed(0)}` : '0'}</td>
                      <td className={`px-4 py-3 text-right font-bold ${item.total_assets >= 0 ? 'text-gold' : 'text-danger'}`}>
                        {item.total_assets?.toFixed(0)}
                      </td>
                    </>
                  )}
                  {tab === 'balance' && (
                    <>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.balance?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.active_bets?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gold">{item.available_funds?.toFixed(0)}</td>
                    </>
                  )}
                  {tab === 'accuracy' && (
                    <>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.total_bets}</td>
                      <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{item.wins}</td>
                      <td className="px-4 py-3 text-right font-bold text-gold">{item.accuracy}%</td>
                    </>
                  )}
                  {tab === 'weekly' && (
                    <td className={`px-4 py-3 text-right font-bold ${item.weekly_gain >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.weekly_gain >= 0 ? '+' : ''}{item.weekly_gain?.toFixed(0)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
