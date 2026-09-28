import { useEffect, useRef, useState } from 'react';
import type {
  BattleEvent,
  BattleStateView,
  PetView,
} from '@rockingdom/shared';
import {
  PET_DEFINITIONS,
  SKILL_DEFINITIONS,
  getActualSkillCost,
} from '@rockingdom/shared';
import type { GameController } from '../hooks/useGame';
import type { CurrentUser } from '../auth/user';
import type { FloatingNumber, PetAnimState } from '../types';
import PetSprite from '../components/PetSprite';
import UserBadge from '../components/UserBadge';
import HPBar from '../components/HPBar';
import EnergyBar from '../components/EnergyBar';
import SkillCard from '../components/SkillCard';
import BattleLog from '../components/BattleLog';
import BattleFx from '../components/BattleFx';
import BattleChat from '../components/BattleChat';
import FloatingNumberLayer from '../components/FloatingNumberLayer';
import { playBGM, playSFX } from '../audio';

interface Props {
  game: GameController;
  user: CurrentUser;
}

type Side = 'self' | 'opponent';

export default function BattlePage({ game, user }: Props) {
  const [petAnim, setPetAnim] = useState<Partial<Record<Side, PetAnimState>>>({});
  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const [log, setLog] = useState<BattleEvent[]>([]);
  const [animating, setAnimating] = useState(false);
  const [switchPanelOpen, setSwitchPanelOpen] = useState(false);
  const [fx, setFx] = useState<{ id: number; side: Side; kind: 'attack' | 'hit' } | null>(null);
  const [shaking, setShaking] = useState(false);

  const floaterIdRef = useRef(0);
  const fxIdRef = useRef(0);

  useEffect(() => {
    playBGM('battle');
  }, []);

  // 回合结算动画：根据服务器事件播放，动画期间禁用行动。
  // 注意：界面始终渲染 game.gameState（权威状态），动画只做表现，不改状态。
  useEffect(() => {
    if (game.turnSeq === 0) return;
    const events = game.lastEvents;
    const selfId = game.gameState?.self.id;
    if (!events.length || !selfId) return;

    setAnimating(true);
    let delay = 500;
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const sideOf = (playerId?: string): Side =>
      playerId === selfId ? 'self' : 'opponent';

    const addFloater = (f: Omit<FloatingNumber, 'id'>) => {
      floaterIdRef.current += 1;
      setFloaters((list) => [...list, { ...f, id: floaterIdRef.current }]);
    };

    const triggerFx = (side: Side, kind: 'attack' | 'hit') => {
      fxIdRef.current += 1;
      setFx({ id: fxIdRef.current, side, kind });
    };
    const triggerShake = () => {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 450);
    };

    for (const ev of events) {
      schedule(() => {
        switch (ev.type) {
          case 'ATTACK': {
            setPetAnim((a) => ({ ...a, [sideOf(ev.actorId)]: 'attack' }));
            triggerFx(sideOf(ev.actorId), 'attack');
            playSFX('attack');
            break;
          }
          case 'DAMAGE': {
            setPetAnim((a) => ({ ...a, [sideOf(ev.targetId)]: 'hit' }));
            triggerFx(sideOf(ev.targetId), 'hit');
            triggerShake();
            addFloater({
              side: sideOf(ev.targetId),
              value: -(ev.value ?? 0),
              kind: 'damage',
            });
            playSFX('hit');
            break;
          }
          case 'HEAL': {
            setPetAnim((a) => ({ ...a, [sideOf(ev.actorId)]: 'heal' }));
            addFloater({
              side: sideOf(ev.actorId),
              value: ev.value ?? 0,
              kind: 'heal',
            });
            playSFX('heal');
            break;
          }
          case 'ENERGY': {
            if ((ev.value ?? 0) > 0) {
              addFloater({
                side: sideOf(ev.actorId),
                value: ev.value ?? 0,
                kind: 'energy',
              });
              playSFX('energy');
            }
            break;
          }
          case 'BUFF': {
            addFloater({
              side: sideOf(ev.actorId),
              value: 0,
              kind: 'buff',
              label: '↑',
            });
            break;
          }
          case 'DEATH': {
            setPetAnim((a) => ({ ...a, [sideOf(ev.targetId)]: 'death' }));
            break;
          }
          case 'SWITCH': {
            setPetAnim((a) => ({ ...a, [sideOf(ev.actorId)]: 'switch' }));
            playSFX('switch');
            break;
          }
          case 'DEFENSE': {
            playSFX('defense');
            break;
          }
          default:
            break;
        }

        schedule(() => {
          setPetAnim((a) => ({ ...a, [sideOf(ev.actorId)]: 'idle' }));
          setPetAnim((a) => ({ ...a, [sideOf(ev.targetId)]: 'idle' }));
        }, 420);
      }, delay);
      delay += 760;
    }

    schedule(() => {
      setLog((l) => [...l, ...events]);
      setAnimating(false);
      setPetAnim({});
      setFloaters([]);
      setFx(null);
    }, delay + 200);

    return () => timers.forEach(clearTimeout);
  }, [game.turnSeq]);

  const state: BattleStateView | null = game.gameState;
  const self = state?.self;
  const opp = state?.opponent;
  const selfId = self?.id;
  const selfActive: PetView | null =
    self?.pets.find((p) => p.instanceId === self.activePetInstanceId) ?? null;
  const oppActive: PetView | null =
    opp?.pets.find((p) => p.instanceId === opp.activePetInstanceId) ?? null;

  const phase = state?.phase ?? 'BATTLE';
  const forcedSwitchForSelf =
    phase === 'FORCED_SWITCH' &&
    (state?.forcedSwitchPlayerIds.includes(selfId ?? '') ?? false);

  const actionSubmitted = self?.actionSubmitted ?? false;
  const canAct =
    phase === 'BATTLE' && !actionSubmitted && !animating && !forcedSwitchForSelf;

  const activeSkills =
    selfActive != null ? PET_DEFINITIONS[selfActive.petId]?.skillIds ?? [] : [];
  const skills = activeSkills
    .map((id) => SKILL_DEFINITIONS[id])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const benched = self?.pets.filter((p) => p.status === 'BENCHED') ?? [];

  const onSelectSkill = (skillId: string) => {
    if (!canAct) return;
    playSFX('click');
    game.chooseAction({ type: 'SKILL', skillId });
  };

  const onSwitchTo = (instanceId: string) => {
    setSwitchPanelOpen(false);
    game.chooseAction({ type: 'SWITCH', targetInstanceId: instanceId });
  };

  const phaseLabel = animating
    ? '战斗执行中……'
    : actionSubmitted
      ? '已选择行动，等待对方……'
      : phase === 'FORCED_SWITCH'
        ? '请选择下一只出战宠物'
        : '请选择本回合行动';

  const spriteAnim = (pet: PetView | null, side: Side): PetAnimState => {
    if (pet?.status === 'DEFEATED') return 'death';
    return petAnim[side] ?? 'idle';
  };

  return (
    <div className="page page--battle">
      <div className="battle-topbar">
        <UserBadge user={user} className="user-badge--static" />
        <span className="battle-turn">第 {state?.turn ?? 1} 回合</span>
        <span className="battle-phase">{phaseLabel}</span>
        {!game.connected && <span className="battle-reconnect">重连中……</span>}
      </div>

      <div className={`battle-arena ${shaking ? 'battle-arena--shake' : ''}`}>
        <div className="battle-player battle-player--self">
          <div className="battle-player__info">
            <div className="battle-player__name">{self?.name}</div>
            <HPBar
              hp={selfActive?.hp ?? 0}
              maxHp={selfActive?.maxHp ?? 1}
              side="self"
            />
            <EnergyBar
              energy={selfActive?.energy ?? 0}
              maxEnergy={selfActive?.maxEnergy ?? 10}
            />
          </div>
          {selfActive && (
            <div className="battle-player__sprite" key={selfActive.instanceId}>
              <PetSprite
                petId={selfActive.petId}
                element={selfActive.element}
                anim={spriteAnim(selfActive, 'self')}
                size={190}
              />
            </div>
          )}
        </div>

        <div className="battle-vs">VS</div>

        <div className="battle-player battle-player--opponent">
          {oppActive && (
            <div className="battle-player__sprite" key={oppActive.instanceId}>
              <PetSprite
                petId={oppActive.petId}
                element={oppActive.element}
                anim={spriteAnim(oppActive, 'opponent')}
                size={190}
              />
            </div>
          )}
          <div className="battle-player__info">
            <div className="battle-player__name">{opp?.name}</div>
            <HPBar
              hp={oppActive?.hp ?? 0}
              maxHp={oppActive?.maxHp ?? 1}
              side="opponent"
            />
            <EnergyBar
              energy={oppActive?.energy ?? 0}
              maxEnergy={oppActive?.maxEnergy ?? 10}
            />
          </div>
        </div>

        <FloatingNumberLayer floaters={floaters} />
        {fx && <BattleFx key={fx.id} side={fx.side} kind={fx.kind} />}
        <BattleChat selfId={selfId ?? ''} />
      </div>

      <div className="battle-controls">
        <div className="battle-skills">
          {skills.map((skill) => {
            const cost = selfActive
              ? getActualSkillCost(selfActive.petId, skill, selfActive.passive)
              : skill.cost;
            const disabled = !canAct || selfActive == null || selfActive.energy < cost;
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                cost={cost}
                disabled={disabled}
                onSelect={() => onSelectSkill(skill.id)}
              />
            );
          })}
        </div>

        <div className="battle-actions">
          <button
            className="btn btn--ghost"
            onClick={() => {
              playSFX('open');
              setSwitchPanelOpen(true);
            }}
            disabled={!canAct || benched.length === 0}
          >
            切换宠物
          </button>
          <button
            className="btn btn--danger-ghost"
            onClick={() => {
              playSFX('danger');
              game.surrender();
            }}
          >
            认输
          </button>
        </div>
      </div>

      <BattleLog events={log} />

      {switchPanelOpen && (
        <div className="modal">
          <div className="modal__box">
            <h3 className="modal__title">选择要换上的宠物</h3>
            <div className="modal__pets">
              {benched.map((pet) => (
                <button
                  key={pet.instanceId}
                  className="modal__pet"
                  onClick={() => onSwitchTo(pet.instanceId)}
                >
                  <PetSprite petId={pet.petId} element={pet.element} size={120} />
                  <span className="modal__pet-name">{pet.name}</span>
                  <span className="modal__pet-hp">
                    {pet.hp}/{pet.maxHp}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="btn btn--ghost"
              onClick={() => {
                playSFX('back');
                setSwitchPanelOpen(false);
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {forcedSwitchForSelf && (
        <div className="modal">
          <div className="modal__box">
            <h3 className="modal__title">你的宠物倒下了，选择下一只出战宠物</h3>
            <div className="modal__pets">
              {self?.pets
                .filter((p) => p.status !== 'DEFEATED')
                .map((pet) => (
                  <button
                    key={pet.instanceId}
                    className="modal__pet"
                    onClick={() => game.confirmSwitch(pet.instanceId)}
                  >
                    <PetSprite petId={pet.petId} element={pet.element} size={120} />
                    <span className="modal__pet-name">{pet.name}</span>
                    <span className="modal__pet-hp">
                      {pet.hp}/{pet.maxHp}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
