import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TabBar from '../components/TabBar';

const TABS = [
  { key: 'betting', label: '投注管理', icon: '⚽' },
  { key: 'users', label: '用户管理', icon: '👥' },
  { key: 'tournament', label: '赛事管理', icon: '📊' },
  { key: 'system', label: '系统设置', icon: '⚙️' },
];

const BET_TYPES = [
  { value: 'match_result', label: '比赛胜负' },
  { value: 'group_advance', label: '小组出线' },
  { value: 'champion', label: '冠军竞猜' },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('betting');
  const isSuper = user?.role === 'admin';

  const filteredTabs = isSuper ? TABS : TABS.filter((t) => t.key === 'betting' || t.key === 'tournament');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 football-pattern min-h-screen">
      <h1 className="text-3xl font-bold text-gold mb-6 text-center">⚙️ 管理后台</h1>
      <TabBar tabs={filteredTabs} active={tab} onChange={setTab} />

      {tab === 'betting' && <BettingManager />}
      {tab === 'users' && isSuper && <UserManager />}
      {tab === 'tournament' && <TournamentManager />}
      {tab === 'system' && isSuper && <SystemManager />}
    </div>
  );
}

function BettingManager() {
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', bet_type: 'match_result', deadline: '', options: [{ label: '', odds: '' }, { label: '', odds: '' }] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEvents();
    api.get('/tournament/teams').then((res) => setTeams(res.data));
  }, []);

  const loadEvents = async () => {
    const res = await api.get('/betting/events');
    setEvents(res.data);
  };

  const createEvent = async () => {
    try {
      if (!form.deadline) { setMessage('⚠️ 请先设置截止时间！'); return; }
      const options = form.options.filter((o) => o.label && o.odds).map((o) => ({ label: o.label, odds: parseFloat(o.odds) }));
      if (options.length < 2) { setMessage('至少需要2个选项'); return; }
      await api.post('/betting/events', { ...form, options });
      setMessage('创建成功');
      setShowCreate(false);
      setForm({ title: '', description: '', bet_type: 'match_result', deadline: '', options: [{ label: '', odds: '' }, { label: '', odds: '' }] });
      loadEvents();
    } catch (err) {
      setMessage(err.response?.data?.detail || '创建失败');
    }
  };

  const closeEvent = async (id) => {
    await api.post(`/betting/events/${id}/close`);
    loadEvents();
  };

  const settleEvent = async (id, optionId) => {
    await api.post(`/betting/events/${id}/settle`, { winning_option_id: optionId });
    loadEvents();
  };

  const deleteEvent = async (id) => {
    if (!confirm('确定删除？下注金额将退还给玩家')) return;
    await api.delete(`/betting/events/${id}`);
    loadEvents();
  };

  const addOption = () => setForm({ ...form, options: [...form.options, { label: '', odds: '' }] });
  const updateOption = (i, field, val) => {
    const opts = [...form.options];
    opts[i][field] = val;
    setForm({ ...form, options: opts });
  };
  const removeOption = (i) => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });

  const generateMatchOptions = () => {
    setForm({
      ...form,
      options: [
        { label: '主队胜', odds: '' },
        { label: '平局', odds: '' },
        { label: '客队胜', odds: '' },
      ],
    });
  };

  const generateChampionBet = () => {
    const opts = teams.map((t) => ({ label: `${t.flag} ${t.name_cn}`, odds: '10' }));
    setForm({
      title: '🏆 2026世界杯冠军竞猜',
      description: '猜猜谁能捧起大力神杯？',
      bet_type: 'champion',
      deadline: form.deadline,
      options: opts,
    });
    setShowCreate(true);
  };

  const generateGroupAdvanceBet = (groupName) => {
    const groupTeams = teams.filter((t) => t.group_name === groupName);
    const opts = groupTeams.map((t) => ({ label: `${t.flag} ${t.name_cn}`, odds: '2.5' }));
    setForm({
      title: `🏟️ ${groupName}组出线竞猜`,
      description: `猜猜${groupName}组哪支球队能晋级淘汰赛？`,
      bet_type: 'group_advance',
      deadline: form.deadline,
      options: opts,
    });
    setShowCreate(true);
  };

  const allGroups = [...new Set(teams.map((t) => t.group_name))].filter(Boolean).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      {message && (
        <div className="glass-card p-3 text-center text-gold border-gold/30 border">
          {message}<button onClick={() => setMessage('')} className="ml-4 text-green-400">✕</button>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-bold text-white">投注事件列表</h3>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generateChampionBet} className="btn-green !py-1.5 !px-3 text-xs">🏆 一键创建冠军竞猜</button>
          <div className="relative group">
            <button className="btn-green !py-1.5 !px-3 text-xs">🏟️ 一键创建小组出线 ▾</button>
            <div className="absolute right-0 top-full mt-1 glass-card p-2 hidden group-hover:grid grid-cols-4 gap-1 z-50 min-w-[200px]">
              {allGroups.map((g) => (
                <button key={g} onClick={() => generateGroupAdvanceBet(g)} className="text-xs px-2 py-1.5 rounded hover:bg-gold/20 text-green-200 hover:text-gold transition-all whitespace-nowrap">
                  {g}组
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-gold !py-1.5 !px-3 text-xs">
            {showCreate ? '取消' : '+ 自定义投注'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="glass-card p-6">
          <h4 className="text-lg font-bold text-gold mb-4">创建新投注</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-green-300 mb-1">标题</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" placeholder="例：巴西 vs 摩洛哥" />
              </div>
              <div>
                <label className="block text-sm text-green-300 mb-1">类型</label>
                <select value={form.bet_type} onChange={(e) => setForm({ ...form, bet_type: e.target.value })} className="w-full">
                  {BET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-green-300 mb-1">描述（可选）</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" rows="2" placeholder="投注说明..." />
            </div>
            <div>
              <label className="block text-sm text-green-300 mb-1">截止时间</label>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-green-300">投注选项 ({form.options.length}个)</label>
                <div className="flex gap-2">
                  {form.bet_type === 'match_result' && (
                    <button onClick={generateMatchOptions} className="btn-green !py-1 !px-3 text-xs">生成胜/平/负</button>
                  )}
                  <button onClick={addOption} className="btn-green !py-1 !px-3 text-xs">+ 添加选项</button>
                </div>
              </div>
              <div className={form.options.length > 6 ? 'max-h-64 overflow-y-auto pr-2' : ''}>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={opt.label} onChange={(e) => updateOption(i, 'label', e.target.value)} className="flex-1" placeholder="选项名称" />
                    <input type="number" step="0.01" value={opt.odds} onChange={(e) => updateOption(i, 'odds', e.target.value)} className="w-24" placeholder="赔率" />
                    {form.options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="text-danger hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={createEvent} className="btn-gold w-full">创建投注</button>
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="glass-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                  event.status === 'open' ? 'bg-success/20 text-success' :
                  event.status === 'closed' ? 'bg-warning/20 text-warning' :
                  'bg-green-800/20 text-green-400'
                }`}>{event.status === 'open' ? '进行中' : event.status === 'closed' ? '已截止' : '已结算'}</span>
                <span className="font-bold text-white">{event.title}</span>
              </div>
              <div className="flex gap-2">
                {event.status === 'open' && (
                  <button onClick={() => closeEvent(event.id)} className="btn-green !py-1 !px-3 text-xs">截止</button>
                )}
                {event.status !== 'settled' && (
                  <button onClick={() => deleteEvent(event.id)} className="btn-danger !py-1 !px-3 text-xs">删除</button>
                )}
              </div>
            </div>
            <div className="text-xs text-green-400 mb-3">
              截止：{new Date(event.deadline).toLocaleString('zh-CN')}
            </div>
            <div className="flex flex-wrap gap-2">
              {event.options?.map((opt) => (
                <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                  event.winning_option_id === opt.id
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-primary/30 text-green-200'
                }`}>
                  <span>{opt.label}</span>
                  <span className="text-gold text-xs">({opt.odds})</span>
                  {(event.status === 'open' || event.status === 'closed') && event.status !== 'settled' && (
                    <button onClick={() => settleEvent(event.id, opt.id)} className="text-xs text-gold hover:text-yellow-300 ml-1" title="选为获胜">✓</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserManager() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editRole, setEditRole] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const res = await api.get('/admin/users');
    setUsers(res.data);
  };

  const updateUser = async (userId) => {
    try {
      const data = {};
      if (editBalance !== '') data.balance = parseFloat(editBalance);
      if (editRole) data.role = editRole;
      await api.put(`/admin/users/${userId}`, data);
      setMessage('更新成功');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.detail || '更新失败');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('确定删除该用户？此操作不可恢复')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage('用户已删除');
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.detail || '删除失败');
    }
  };

  return (
    <div className="animate-fade-in">
      {message && (
        <div className="glass-card p-3 mb-4 text-center text-gold border-gold/30 border">
          {message}<button onClick={() => setMessage('')} className="ml-4 text-green-400">✕</button>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/30">
              <th className="px-4 py-3 text-left text-green-400">用户名</th>
              <th className="px-4 py-3 text-center text-green-400">角色</th>
              <th className="px-4 py-3 text-right text-green-400">余额</th>
              <th className="px-4 py-3 text-right text-green-400 hidden sm:table-cell">在投</th>
              <th className="px-4 py-3 text-right text-green-400 hidden sm:table-cell">贷款</th>
              <th className="px-4 py-3 text-right text-green-400">总资产</th>
              <th className="px-4 py-3 text-center text-green-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-primary/10 hover:bg-primary/20">
                <td className="px-4 py-3 font-semibold text-white">{u.username}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-gold/20 text-gold' :
                    u.role === 'vice_admin' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-green-800/20 text-green-400'
                  }`}>{u.role === 'admin' ? '管理员' : u.role === 'vice_admin' ? '副管理' : '玩家'}</span>
                </td>
                <td className="px-4 py-3 text-right text-green-300">{u.balance?.toFixed(0)}</td>
                <td className="px-4 py-3 text-right text-green-300 hidden sm:table-cell">{u.active_bets?.toFixed(0)}</td>
                <td className="px-4 py-3 text-right text-danger hidden sm:table-cell">{u.outstanding_loan > 0 ? u.outstanding_loan?.toFixed(0) : '0'}</td>
                <td className={`px-4 py-3 text-right font-bold ${u.total_assets >= 0 ? 'text-gold' : 'text-danger'}`}>{u.total_assets?.toFixed(0)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                      <button onClick={() => { setEditingUser(u.id); setEditBalance(u.balance.toString()); setEditRole(u.role); }} className="btn-green !py-1 !px-2 text-xs">编辑</button>
                      {u.role !== 'admin' && (
                        <button onClick={() => deleteUser(u.id)} className="btn-danger !py-1 !px-2 text-xs">删除</button>
                      )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingUser(null)}>
          <div className="glass-card p-6 w-full max-w-md gold-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gold mb-4">编辑用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-green-300 mb-1">余额</label>
                <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-sm text-green-300 mb-1">角色</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full">
                  <option value="player">玩家</option>
                  <option value="vice_admin">副管理员</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => updateUser(editingUser)} className="btn-gold flex-1">保存</button>
                <button onClick={() => setEditingUser(null)} className="btn-green flex-1">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentManager() {
  const [groups, setGroups] = useState({});
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const res = await api.get('/tournament/groups');
    setGroups(res.data);
  };

  const saveTeam = async () => {
    try {
      await api.put(`/tournament/teams/${editingTeam}`, teamForm);
      setMessage('更新成功');
      setEditingTeam(null);
      loadGroups();
    } catch (err) {
      setMessage(err.response?.data?.detail || '更新失败');
    }
  };

  const sortedKeys = Object.keys(groups).sort();

  return (
    <div className="animate-fade-in">
      {message && (
        <div className="glass-card p-3 mb-4 text-center text-gold border-gold/30 border">
          {message}<button onClick={() => setMessage('')} className="ml-4 text-green-400">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedKeys.map((g) => (
          <div key={g} className="glass-card overflow-hidden">
            <div className="bg-primary/30 px-4 py-2 border-b border-primary/30">
              <h4 className="font-bold text-gold text-sm">小组 {g}</h4>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="px-2 py-1.5 text-left text-green-400">球队</th>
                  <th className="px-2 py-1.5 text-center text-green-400">赛</th>
                  <th className="px-2 py-1.5 text-center text-green-400">胜</th>
                  <th className="px-2 py-1.5 text-center text-green-400">平</th>
                  <th className="px-2 py-1.5 text-center text-green-400">负</th>
                  <th className="px-2 py-1.5 text-center text-green-400">进</th>
                  <th className="px-2 py-1.5 text-center text-green-400">失</th>
                  <th className="px-2 py-1.5 text-center text-green-400">分</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {groups[g].map((t) => (
                  <tr key={t.id} className="border-b border-primary/10">
                    <td className="px-2 py-1.5">
                      <span className="mr-1">{t.flag}</span>
                      <span className="text-white">{t.name_cn}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.played}</td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.wins}</td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.draws}</td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.losses}</td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.goals_for}</td>
                    <td className="px-2 py-1.5 text-center text-green-300">{t.goals_against}</td>
                    <td className="px-2 py-1.5 text-center text-gold font-bold">{t.points}</td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => {
                        setEditingTeam(t.id);
                        setTeamForm({ played: t.played, wins: t.wins, draws: t.draws, losses: t.losses, goals_for: t.goals_for, goals_against: t.goals_against, points: t.points });
                      }} className="text-gold hover:text-yellow-300 text-xs">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {editingTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingTeam(null)}>
          <div className="glass-card p-6 w-full max-w-sm gold-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gold mb-4">编辑球队数据</h3>
            <div className="grid grid-cols-2 gap-3">
              {['played', 'wins', 'draws', 'losses', 'goals_for', 'goals_against', 'points'].map((f) => (
                <div key={f}>
                  <label className="block text-xs text-green-300 mb-1">
                    {{ played: '场次', wins: '胜', draws: '平', losses: '负', goals_for: '进球', goals_against: '失球', points: '积分' }[f]}
                  </label>
                  <input type="number" value={teamForm[f]} onChange={(e) => setTeamForm({ ...teamForm, [f]: parseInt(e.target.value) || 0 })} className="w-full" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveTeam} className="btn-gold flex-1">保存</button>
              <button onClick={() => setEditingTeam(null)} className="btn-green flex-1">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemManager() {
  const [phase, setPhase] = useState('group');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/phase').then((res) => setPhase(res.data.phase));
  }, []);

  const updatePhase = async (newPhase) => {
    try {
      await api.post('/admin/phase', { phase: newPhase });
      setPhase(newPhase);
      setMessage('阶段已更新');
    } catch (err) {
      setMessage(err.response?.data?.detail || '更新失败');
    }
  };

  const takeSnapshot = async () => {
    try {
      await api.post('/admin/weekly-snapshot');
      setMessage('快照已保存');
    } catch (err) {
      setMessage(err.response?.data?.detail || '操作失败');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {message && (
        <div className="glass-card p-3 text-center text-gold border-gold/30 border">
          {message}<button onClick={() => setMessage('')} className="ml-4 text-green-400">✕</button>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4">🏟️ 赛事阶段</h3>
        <div className="flex gap-4">
          <button onClick={() => updatePhase('group')} className={`flex-1 p-4 rounded-xl border transition-all ${phase === 'group' ? 'border-gold bg-gold/10 text-gold' : 'border-primary/30 text-green-300 hover:border-primary'}`}>
            <div className="text-2xl mb-2">📊</div>
            <div className="font-bold">小组赛阶段</div>
          </button>
          <button onClick={() => updatePhase('knockout')} className={`flex-1 p-4 rounded-xl border transition-all ${phase === 'knockout' ? 'border-gold bg-gold/10 text-gold' : 'border-primary/30 text-green-300 hover:border-primary'}`}>
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-bold">淘汰赛阶段</div>
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-4">📸 周快照</h3>
        <p className="text-green-300 text-sm mb-4">保存所有玩家当前资产快照，用于计算本周盈亏排行榜。建议每周一早上执行一次。</p>
        <button onClick={takeSnapshot} className="btn-gold">保存快照</button>
      </div>
    </div>
  );
}
