import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TabBar from '../components/TabBar';

const BET_TYPE_LABELS = {
  match_result: '⚽ 比赛胜负',
  group_advance: '🏟️ 小组出线',
  champion: '🏆 冠军竞猜',
};

const BET_TYPE_ORDER = ['champion', 'group_advance', 'match_result'];

const STATUS_LABELS = {
  open: { text: '进行中', color: 'text-success' },
  closed: { text: '已截止', color: 'text-warning' },
  settled: { text: '已结算', color: 'text-green-400' },
};

const TABS = [
  { key: 'open', label: '进行中', icon: '🔥' },
  { key: 'settled', label: '已结算', icon: '✅' },
  { key: 'my', label: '我的投注', icon: '📋' },
];

export default function Betting() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('open');
  const [events, setEvents] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [betAmounts, setBetAmounts] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'my') {
        const res = await api.get('/betting/my-bets');
        setMyBets(res.data);
      } else {
        const status = tab === 'open' ? 'open' : 'settled';
        const res = await api.get(`/betting/events?status=${status}`);
        setEvents(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async (eventId) => {
    const optionId = selectedOptions[eventId];
    const amount = parseFloat(betAmounts[eventId]);
    if (!optionId) { setMessage('请选择一个投注选项'); return; }
    if (!amount || amount <= 0) { setMessage('请输入有效金额'); return; }
    try {
      const res = await api.post(`/betting/events/${eventId}/bet`, { option_id: optionId, amount });
      setMessage(res.data.message);
      await refreshUser();
      loadData();
      setBetAmounts({ ...betAmounts, [eventId]: '' });
      setSelectedOptions({ ...selectedOptions, [eventId]: null });
    } catch (err) {
      setMessage(err.response?.data?.detail || '投注失败');
    }
  };

  const maxBet = user ? Math.floor(user.balance * 0.5) : 0;

  const groupedEvents = {};
  events.forEach((e) => {
    const type = e.bet_type || 'match_result';
    if (!groupedEvents[type]) groupedEvents[type] = [];
    groupedEvents[type].push(e);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 football-pattern min-h-screen">
      <h1 className="text-3xl font-bold text-gold mb-6 text-center">⚽ 投注大厅</h1>

      {user && (
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-green-300">余额：</span>
            <span className="text-gold font-bold text-xl">{user.balance?.toFixed(0)}</span>
          </div>
          <div>
            <span className="text-green-300">单注上限：</span>
            <span className="text-gold font-semibold">{maxBet}</span>
            <span className="text-green-400 text-xs ml-1">(50%)</span>
          </div>
        </div>
      )}

      {message && (
        <div className="glass-card p-3 mb-4 text-center text-gold border-gold/30 border">
          {message}
          <button onClick={() => setMessage('')} className="ml-4 text-green-400 text-sm">✕</button>
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <div className="text-center py-12 text-green-300">加载中...</div>
      ) : tab === 'my' ? (
        <MyBetsList bets={myBets} />
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-green-400">
          <div className="text-4xl mb-4">{tab === 'open' ? '🎯' : '📋'}</div>
          <p>{tab === 'open' ? '暂无进行中的投注' : '暂无已结算的投注'}</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {BET_TYPE_ORDER.filter((t) => groupedEvents[t]).map((type) => (
            <div key={type}>
              <h2 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
                {BET_TYPE_LABELS[type]}
                <span className="text-sm font-normal text-green-400">({groupedEvents[type].length})</span>
              </h2>
              <div className="space-y-4">
                {groupedEvents[type].map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    maxBet={maxBet}
                    betAmount={betAmounts[event.id] || ''}
                    selectedOption={selectedOptions[event.id]}
                    onAmountChange={(val) => setBetAmounts({ ...betAmounts, [event.id]: val })}
                    onOptionSelect={(id) => setSelectedOptions({ ...selectedOptions, [event.id]: id })}
                    onPlaceBet={() => placeBet(event.id)}
                    isOpen={tab === 'open'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, maxBet, betAmount, selectedOption, onAmountChange, onOptionSelect, onPlaceBet, isOpen }) {
  const status = STATUS_LABELS[event.status] || STATUS_LABELS.open;
  const deadline = new Date(event.deadline);
  const now = new Date();
  const isExpired = now > deadline;

  return (
    <div className="glass-card p-6 hover:border-gold/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{event.title}</h3>
          {event.description && <p className="text-green-300 text-sm mt-1">{event.description}</p>}
        </div>
        <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
      </div>

      <div className="text-xs text-green-400 mb-4">
        ⏰ 截止时间：{deadline.toLocaleString('zh-CN')}
        {isOpen && isExpired && <span className="text-danger ml-2">（已过期）</span>}
      </div>

      <div className={`grid gap-3 mb-4 ${
        event.options?.length > 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      }`}>
        {event.options?.map((opt) => (
          <button
            key={opt.id}
            onClick={() => isOpen && !isExpired && onOptionSelect(opt.id)}
            className={`p-3 rounded-xl border text-center transition-all ${
              selectedOption === opt.id
                ? 'border-gold bg-gold/10 text-gold'
                : event.winning_option_id === opt.id
                ? 'border-success bg-success/10 text-success'
                : 'border-primary/30 hover:border-primary text-green-200'
            } ${isOpen && !isExpired ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="font-semibold text-sm">{opt.label}</div>
            <div className="text-xs mt-1">
              赔率 <span className="text-gold font-bold">{opt.odds?.toFixed(2)}</span>
            </div>
            {event.winning_option_id === opt.id && (
              <div className="text-xs text-success mt-1">✓ 获胜选项</div>
            )}
          </button>
        ))}
      </div>

      {isOpen && !isExpired && (
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder={`金额（上限 ${maxBet}）`}
            className="flex-1"
            min="1"
            max={maxBet}
          />
          <button onClick={onPlaceBet} className="btn-gold whitespace-nowrap">
            下注
          </button>
        </div>
      )}
    </div>
  );
}

function MyBetsList({ bets }) {
  if (bets.length === 0) {
    return (
      <div className="text-center py-12 text-green-400">
        <div className="text-4xl mb-4">📋</div>
        <p>你还没有下过注</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {bets.map((bet) => (
        <div key={bet.id} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white">{bet.event_title}</h4>
            <span className={`text-sm font-semibold ${
              bet.won === true ? 'text-success' : bet.won === false ? 'text-danger' : 'text-warning'
            }`}>
              {bet.won === true ? '✅ 猜对' : bet.won === false ? '❌ 猜错' : '⏳ 等待结果'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-green-300">
            <span>选择：<span className="text-white">{bet.option_label}</span></span>
            <span>金额：<span className="text-gold">{bet.amount?.toFixed(0)}</span></span>
            <span>赔率：<span className="text-gold">{bet.odds?.toFixed(2)}</span></span>
            {bet.won === true && (
              <span>赢得：<span className="text-success font-bold">{bet.payout?.toFixed(0)}</span></span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
