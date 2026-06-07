import { useState, useEffect } from 'react';
import api from '../api';
import TabBar from '../components/TabBar';

const TABS = [
  { key: 'groups', label: '小组赛积分', icon: '📊' },
  { key: 'knockout', label: '淘汰赛对阵', icon: '🏆' },
];

const ROUND_LABELS = {
  round_32: '32强',
  round_16: '16强',
  quarter_final: '四分之一决赛',
  semi_final: '半决赛',
  third_place: '三四名决赛',
  final: '决赛 🏆',
};

const ROUND_ORDER = ['round_32', 'round_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

export default function Tournament() {
  const [tab, setTab] = useState('groups');
  const [groups, setGroups] = useState({});
  const [knockout, setKnockout] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'groups') {
        const res = await api.get('/tournament/groups');
        setGroups(res.data);
      } else {
        const res = await api.get('/tournament/knockout');
        setKnockout(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 football-pattern min-h-screen">
      <h1 className="text-3xl font-bold text-gold mb-6 text-center">📊 赛程积分</h1>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <div className="text-center py-12 text-green-300">加载中...</div>
      ) : tab === 'groups' ? (
        <GroupsView groups={groups} />
      ) : (
        <KnockoutView knockout={knockout} />
      )}
    </div>
  );
}

function GroupsView({ groups }) {
  const sortedKeys = Object.keys(groups).sort();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {sortedKeys.map((groupName) => (
        <div key={groupName} className="glass-card overflow-hidden">
          <div className="bg-primary/30 px-4 py-2 border-b border-primary/30">
            <h3 className="font-bold text-gold">小组 {groupName}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="px-3 py-2 text-left text-green-400">#</th>
                <th className="px-3 py-2 text-left text-green-400">球队</th>
                <th className="px-3 py-2 text-center text-green-400">赛</th>
                <th className="px-3 py-2 text-center text-green-400">胜</th>
                <th className="px-3 py-2 text-center text-green-400">平</th>
                <th className="px-3 py-2 text-center text-green-400">负</th>
                <th className="px-3 py-2 text-center text-green-400 hidden sm:table-cell">进</th>
                <th className="px-3 py-2 text-center text-green-400 hidden sm:table-cell">失</th>
                <th className="px-3 py-2 text-center text-green-400">净胜</th>
                <th className="px-3 py-2 text-center text-green-400 font-bold">分</th>
              </tr>
            </thead>
            <tbody>
              {groups[groupName].map((team, i) => (
                <tr key={team.id} className={`border-b border-primary/10 ${i < 2 ? 'bg-success/5' : ''} ${team.eliminated ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 text-green-300">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="flag-emoji mr-2">{team.flag}</span>
                    <span className="text-white font-medium">{team.name_cn}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-green-300">{team.played}</td>
                  <td className="px-3 py-2 text-center text-green-300">{team.wins}</td>
                  <td className="px-3 py-2 text-center text-green-300">{team.draws}</td>
                  <td className="px-3 py-2 text-center text-green-300">{team.losses}</td>
                  <td className="px-3 py-2 text-center text-green-300 hidden sm:table-cell">{team.goals_for}</td>
                  <td className="px-3 py-2 text-center text-green-300 hidden sm:table-cell">{team.goals_against}</td>
                  <td className="px-3 py-2 text-center text-green-300">{team.goal_diff}</td>
                  <td className="px-3 py-2 text-center font-bold text-gold">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function KnockoutView({ knockout }) {
  return (
    <div className="space-y-8 animate-fade-in">
      {ROUND_ORDER.filter((r) => knockout[r]).map((round) => (
        <div key={round}>
          <h3 className="text-xl font-bold text-gold mb-4 text-center">{ROUND_LABELS[round]}</h3>
          <div className={`grid gap-4 ${
            knockout[round].length > 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            knockout[round].length > 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'
          }`}>
            {knockout[round].map((match) => (
              <div key={match.id} className="glass-card p-4">
                <div className="space-y-2">
                  <TeamSlot
                    team={match.team1}
                    placeholder={match.team1_placeholder}
                    score={match.score1}
                    isWinner={match.winner?.id === match.team1?.id}
                  />
                  <div className="text-center text-xs text-green-400 font-mono">VS</div>
                  <TeamSlot
                    team={match.team2}
                    placeholder={match.team2_placeholder}
                    score={match.score2}
                    isWinner={match.winner?.id === match.team2?.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamSlot({ team, placeholder, score, isWinner }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${isWinner ? 'bg-gold/10 border border-gold/30' : 'bg-primary-dark/30'}`}>
      <div className="flex items-center gap-2">
        {team ? (
          <>
            <span className="flag-emoji text-base">{team.flag}</span>
            <span className={`font-medium ${isWinner ? 'text-gold' : 'text-white'}`}>{team.name_cn}</span>
          </>
        ) : (
          <span className="text-green-400 text-sm">{placeholder}</span>
        )}
      </div>
      {score !== null && score !== undefined && (
        <span className={`font-bold text-lg ${isWinner ? 'text-gold' : 'text-green-300'}`}>{score}</span>
      )}
    </div>
  );
}
