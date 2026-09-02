import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react';
import {
  PET_LIST,
  SKILL_DEFINITIONS,
  effectiveSkillCost,
  createInitialPassiveState,
} from '@rockingdom/shared';
import type { GameController } from '../hooks/useGame';
import PetSprite from '../components/PetSprite';
import Tooltip from '../components/Tooltip';
import { SkillTooltipContent } from '../components/SkillCard';
import ParticleBackground from '../components/ParticleBackground';
import { playBGM, playSFX } from '../audio';

interface Props {
  game: GameController;
}

const TOTAL = PET_LIST.length;

/** 3 只宠物 3D 轮盘选择（滚轮 / 拖动 / 点击） */
export default function StarterSelectionPage({ game }: Props) {
  const [index, setIndex] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    playBGM('lobby');
  }, []);

  const selectedPet = PET_LIST[index];
  const opponentReady = game.gameState?.opponent.hasSelectedStarter ?? false;

  const prev = () => setIndex((i) => (i + TOTAL - 1) % TOTAL);
  const next = () => setIndex((i) => (i + 1) % TOTAL);

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0) next();
    else prev();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    dragStart.current = null;
  };

  const confirm = () => {
    if (confirmed) return;
    setConfirmed(true);
    game.selectStarter(selectedPet.id);
    playSFX('match');
  };

  return (
    <div className="page page--starter">
      <ParticleBackground />
      <div className="starter-content">
        <h2 className="starter-title">选择你的首发宠物</h2>

        <div
          className="carousel"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="carousel__stage">
            {PET_LIST.map((pet, i) => {
              const dist = ((i - index) % TOTAL + TOTAL) % TOTAL; // 0,1,2
              const norm = dist > 1 ? dist - TOTAL : dist; // -1,0,1
              const cls =
                norm === 0
                  ? 'carousel__item carousel__item--center'
                  : norm === 1
                    ? 'carousel__item carousel__item--right'
                    : 'carousel__item carousel__item--left';
              return (
                <div
                  key={pet.id}
                  className={cls}
                  onClick={() => setIndex(i)}
                >
                  <PetSprite petId={pet.id} element={pet.element} size={200} />
                  <span className="carousel__name">{pet.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="starter-skills">
          {selectedPet.skillIds.map((id) => {
            const skill = SKILL_DEFINITIONS[id];
            if (!skill) return null;
            const cost = effectiveSkillCost(
              selectedPet.id,
              skill,
              createInitialPassiveState(),
            );
            return (
              <Tooltip
                key={id}
                content={<SkillTooltipContent skill={skill} cost={cost} />}
              >
                <div className="skill-card skill-card--info">
                  <span className="skill-card__name">{skill.name}</span>
                  <span className="skill-card__cost">⚡{cost}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>

        <div className="starter-actions">
          {confirmed ? (
            <div className="starter-waiting">
              <button className="btn btn--primary" disabled>
                已选择 {selectedPet.name}
              </button>
              {!opponentReady && <p className="starter-waiting__text">等待对方选择首发宠物中……</p>}
              {opponentReady && <p className="starter-waiting__text">对方已选择，即将进入战斗……</p>}
            </div>
          ) : (
            <button className="btn btn--primary btn--glow" onClick={confirm}>
              确定选择 {selectedPet.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
