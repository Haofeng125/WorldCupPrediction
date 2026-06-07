import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TabBar from '../components/TabBar';

const TABS = [
  { key: 'apply', label: '申请贷款', icon: '🏦' },
  { key: 'rules', label: '贷款规则', icon: '📜' },
];

export default function Loan() {
  const [tab, setTab] = useState('apply');
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loan/status');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const borrow = async () => {
    try {
      const res = await api.post('/loan/borrow');
      setMessage(res.data.message);
      setMessageType('success');
      await refreshUser();
      await loadStatus();
    } catch (err) {
      setMessage(err.response?.data?.detail || '借款失败');
      setMessageType('error');
    }
  };

  const repay = async () => {
    try {
      const res = await api.post('/loan/repay');
      setMessage(res.data.message);
      setMessageType('success');
      await refreshUser();
      await loadStatus();
    } catch (err) {
      setMessage(err.response?.data?.detail || '还款失败');
      setMessageType('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 football-pattern min-h-screen">
      <h1 className="text-3xl font-bold text-gold mb-6 text-center">🏦 贷款中心</h1>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {message && (
        <div className={`glass-card p-3 mb-4 text-center border ${messageType === 'success' ? 'text-success border-success/30' : 'text-danger border-danger/30'}`}>
          {message}
          <button onClick={() => setMessage('')} className="ml-4 text-green-400 text-sm">✕</button>
        </div>
      )}

      {tab === 'rules' ? <LoanRules /> : (
        loading ? (
          <div className="text-center py-12 text-green-300">加载中...</div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Status Card */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 你的财务状况</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="余额" value={status?.balance?.toFixed(0)} icon="💰" />
                <StatCard label="在投金额" value={status?.active_bets?.toFixed(0)} icon="🎯" />
                <StatCard label="总可用" value={status?.total_available?.toFixed(0)} icon="💵" />
                <StatCard label="待还贷款" value={status?.outstanding_loan?.toFixed(0)} icon="📋" color={status?.outstanding_loan > 0 ? 'text-danger' : 'text-success'} />
              </div>
            </div>

            {/* Loan Status */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">🏦 贷款状态</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-primary-dark/30 rounded-xl p-4">
                  <div className="text-sm text-green-400 mb-1">当前阶段</div>
                  <div className="text-xl font-bold text-white">{status?.current_phase === 'group' ? '小组赛' : '淘汰赛'}</div>
                </div>
                <div className="bg-primary-dark/30 rounded-xl p-4">
                  <div className="text-sm text-green-400 mb-1">已用次数 / 上限</div>
                  <div className="text-xl font-bold">
                    <span className={status?.loans_used >= status?.max_loans ? 'text-danger' : 'text-gold'}>{status?.loans_used}</span>
                    <span className="text-green-400"> / {status?.max_loans}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {status?.outstanding_loan > 0 && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-danger font-semibold">待还贷款</div>
                        <div className="text-2xl font-bold text-white">{status?.outstanding_loan?.toFixed(0)}</div>
                      </div>
                      <button onClick={repay} className="btn-gold">还款</button>
                    </div>
                    <div className="text-xs text-green-400 mt-2">💡 余额超过 10,000 时会自动还款</div>
                  </div>
                )}

                {status?.can_borrow ? (
                  <div className="bg-gold/5 border border-gold/30 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">💸</div>
                    <p className="text-green-200 mb-4">你已符合借款条件，可以借 <span className="text-gold font-bold">5,000</span></p>
                    <button onClick={borrow} className="btn-gold text-lg !px-8">立即借款</button>
                  </div>
                ) : (
                  <div className="bg-primary-dark/30 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🔒</div>
                    <p className="text-green-400">
                      {status?.outstanding_loan > 0
                        ? '请先还清当前贷款'
                        : status?.loans_used >= status?.max_loans
                        ? '本阶段贷款次数已用完'
                        : `你还没破产（可用资金 ≥ ${status?.broke_threshold}）`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = 'text-gold' }) {
  return (
    <div className="bg-primary-dark/30 rounded-xl p-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-green-400">{label}</div>
    </div>
  );
}

function LoanRules() {
  return (
    <div className="glass-card p-8 animate-fade-in">
      <h3 className="text-2xl font-bold text-gold mb-6 text-center">📜 贷款规则说明</h3>

      <div className="space-y-6 text-green-200">
        <Section title="💰 贷款额度" items={[
          '每次固定借款 5,000',
          '无利息，借多少还多少',
        ]} />

        <Section title="✅ 借款条件" items={[
          '余额 + 在投金额 < 100（即"破产"状态）',
          '没有未偿还的贷款',
          '本阶段贷款次数未用完',
        ]} />

        <Section title="🔄 贷款次数" items={[
          '小组赛阶段：最多 3 次',
          '淘汰赛阶段：最多 3 次',
          '整个世界杯期间最多 6 次',
        ]} />

        <Section title="💳 还款方式" items={[
          '手动还款：点击"还款"按钮，一次性还清',
          '自动还款：当余额超过 10,000 时，系统自动扣除还贷',
        ]} />

        <Section title="📊 对排行榜的影响" items={[
          '总资产 = 余额 + 在投金额 - 未还贷款',
          '借钱不会让你的排名上升',
          '如果连续借款亏损，总资产可能变为负数',
        ]} />

        <div className="bg-gold/5 border border-gold/30 rounded-xl p-4 mt-8">
          <p className="text-gold text-center font-semibold">
            ⚠️ 理性竞猜，量力而行！贷款是给你第二次机会，不是无限提款机。
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items }) {
  return (
    <div>
      <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-gold mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
