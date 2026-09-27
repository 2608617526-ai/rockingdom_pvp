import { useEffect, useState } from 'react';
import type { HistoryBattleSummary } from '@rockingdom/shared';
import type { CurrentUser } from '../auth/user';
import { fetchHistory } from '../api/auth';

interface Props {
  user: CurrentUser;
  onClose: () => void;
  onSelectBattle: (id: string) => void;
}

const RESULT_LABEL = { win: '胜利', lose: '失败', draw: '平局' } as const;

export default function HistoryModal({ user, onClose, onSelectBattle }: Props) {
  const [battles, setBattles] = useState<HistoryBattleSummary[] | null>(null);
  const [stats, setStats] = useState<{ total: number; wins: number } | null>(null);
  const [error, setError] = useState(false);

  const token = user.token ?? '';

  const load = async () => {
    setError(false);
    setBattles(null);
    setStats(null);
    try {
      const res = await fetchHistory(token);
      if (res.success && res.battles) {
        setBattles(res.battles);
        setStats({ total: res.total ?? res.battles.length, wins: res.wins ?? 0 });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="modal history-modal">
      <div className="modal__box history-modal__box">
        <h3 className="modal__title history-modal__title">⚔ 过往对局</h3>

        {stats && (
          <p className="history-modal__stats">
            总场次 {stats.total} 场 · 胜率{' '}
            {stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0}%
          </p>
        )}

        {battles === null && !error && (
          <p className="history-modal__status">正在加载历史对局……</p>
        )}
        {error && (
          <div className="history-modal__status">
            <p className="history-modal__status">历史对局加载失败</p>
            <button className="btn btn--ghost btn--small" onClick={load}>
              重新加载
            </button>
          </div>
        )}
        {battles && battles.length === 0 && (
          <p className="history-modal__status">暂无过往对局</p>
        )}

        {battles && battles.length > 0 && (
          <div className="history-list">
            {battles.map((b) => (
              <button
                key={b.id}
                className={`history-item history-item--${b.result}`}
                onClick={() => onSelectBattle(b.id)}
              >
                <div className="history-item__side">
                  <img className="history-item__avatar" src={user.avatar} alt="我" />
                  <span className="history-item__name">{user.nickname}</span>
                </div>
                <div className="history-item__vs">
                  <span className={`history-item__result history-item__result--${b.result}`}>
                    {RESULT_LABEL[b.result]}
                  </span>
                  <span className="history-item__time">{formatTime(b.createdAt)}</span>
                </div>
                <div className="history-item__side history-item__side--opp">
                  <span className="history-item__name">{b.opponent.nickname}</span>
                  <img className="history-item__avatar" src={b.opponent.avatar} alt="对手" />
                </div>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn--ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
