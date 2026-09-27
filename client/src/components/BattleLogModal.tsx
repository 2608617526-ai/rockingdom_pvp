import { useEffect, useState } from 'react';
import type { HistoryBattleDetail } from '@rockingdom/shared';
import type { CurrentUser } from '../auth/user';
import { fetchBattleDetail } from '../api/auth';

interface Props {
  user: CurrentUser;
  battleId: string;
  onClose: () => void;
}

const RESULT_LABEL = { win: '胜利', lose: '失败', draw: '平局' } as const;

export default function BattleLogModal({ user, battleId, onClose }: Props) {
  const [battle, setBattle] = useState<HistoryBattleDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(false);
      try {
        const res = await fetchBattleDetail(user.token ?? '', battleId);
        if (cancelled) return;
        if (res.success && res.battle) setBattle(res.battle);
        else setError(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.token, battleId]);

  const self = battle
    ? battle.player1.userId === user.id
      ? battle.player1
      : battle.player2
    : null;
  const opponent = battle
    ? battle.player1.userId === user.id
      ? battle.player2
      : battle.player1
    : null;
  const result = battle
    ? battle.isDraw
      ? 'draw'
      : battle.winnerId === user.id
        ? 'win'
        : 'lose'
    : 'draw';

  return (
    <div className="modal battlelog-modal">
      <div className="modal__box battlelog-modal__box">
        <h3 className="modal__title">战斗日志</h3>

        {error && <p className="battlelog-modal__status">战斗记录读取失败</p>}
        {!error && !battle && <p className="battlelog-modal__status">正在读取战斗记录……</p>}

        {battle && self && opponent && (
          <>
            <div className="battlelog-modal__head">
              <div className="battlelog-modal__player">
                <img className="history-item__avatar" src={self.avatar} alt="我" />
                <span className="history-item__name">{self.nickname}</span>
              </div>
              <span className={`history-item__result history-item__result--${result}`}>
                {RESULT_LABEL[result]}
              </span>
              <div className="battlelog-modal__player">
                <span className="history-item__name">{opponent.nickname}</span>
                <img className="history-item__avatar" src={opponent.avatar} alt="对手" />
              </div>
            </div>

            <div className="battlelog-modal__log">
              {battle.battleLog.map((e, i) => (
                <div
                  key={i}
                  className={`battle-log__entry battle-log__entry--${e.type.toLowerCase()}`}
                >
                  {e.description}
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn btn--ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}
