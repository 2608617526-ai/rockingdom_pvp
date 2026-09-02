import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ElementType, PetId } from '@rockingdom/shared';
import { ELEMENT_COLORS } from '../data/visuals';
import type { PetAnimState } from '../types';

interface Props {
  petId: PetId;
  element: ElementType;
  anim?: PetAnimState;
  size?: number;
  className?: string;
}

/**
 * 宠物立绘。
 * 若 client/public/assets/pets/{petId}.png 存在则自动使用真实图片，
 * 否则回退到内置 SVG 占位形象（火/水/草三种风格）。
 */
export default function PetSprite({
  petId,
  element,
  anim = 'idle',
  size = 170,
  className,
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = `/assets/pets/${petId}.png`;
  const showImg = imgLoaded && !imgFailed;

  return (
    <div
      className={`pet-sprite pet-sprite--${element.toLowerCase()} pet-anim--${anim} ${
        className ?? ''
      }`}
      style={{ width: size, height: size }}
    >
      <img
        className="pet-sprite__img"
        src={imgSrc}
        alt={petId}
        draggable={false}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgFailed(true)}
        style={{ display: showImg ? 'block' : 'none' }}
      />
      <PetSvgPlaceholder
        element={element}
        style={{ display: showImg ? 'none' : 'block' }}
      />
    </div>
  );
}

function PetSvgPlaceholder({
  element,
  style,
}: {
  element: ElementType;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const colors = ELEMENT_COLORS[element];
  return (
    <svg className="pet-sprite__svg" style={style} viewBox="0 0 200 200" width="100%" height="100%">
      <defs>
        <radialGradient id={`body-${uid}`} cx="50%" cy="36%" r="72%">
          <stop offset="0%" stopColor={colors.secondary} />
          <stop offset="58%" stopColor={colors.primary} />
          <stop offset="100%" stopColor="#0b0d1a" />
        </radialGradient>
        <radialGradient id={`eye-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d7e3ff" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="178" rx="52" ry="12" fill="rgba(0,0,0,0.45)" />
      <circle cx="100" cy="106" r="68" fill={`url(#body-${uid})`} />
      <ellipse
        cx="78"
        cy="74"
        rx="24"
        ry="13"
        fill="rgba(255,255,255,0.22)"
        transform="rotate(-20 78 74)"
      />

      {/* 眼睛 */}
      <circle cx="80" cy="97" r="15" fill={`url(#eye-${uid})`} />
      <circle cx="120" cy="97" r="15" fill={`url(#eye-${uid})`} />
      <circle cx="83" cy="99" r="7" fill="#141824" />
      <circle cx="123" cy="99" r="7" fill="#141824" />
      <circle cx="85" cy="96" r="2.4" fill="#ffffff" />
      <circle cx="125" cy="96" r="2.4" fill="#ffffff" />

      {/* 嘴 */}
      <path
        d="M88 128 Q100 140 112 128"
        stroke="#141824"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* 元素装饰 */}
      {element === 'FIRE' && (
        <g>
          <path d="M100 12 Q111 32 104 52 Q100 43 96 52 Q89 32 100 12Z" fill={colors.secondary} />
          <path d="M82 28 Q88 44 84 58 Q81 51 78 58 Q75 44 82 28Z" fill={colors.primary} />
          <path d="M118 28 Q124 44 120 58 Q117 51 114 58 Q111 44 118 28Z" fill={colors.primary} />
        </g>
      )}
      {element === 'WATER' && (
        <g>
          <path d="M100 16 Q112 38 100 50 Q88 38 100 16Z" fill={colors.secondary} />
          <circle cx="68" cy="40" r="7" fill={colors.secondary} />
          <circle cx="132" cy="40" r="7" fill={colors.secondary} />
          <circle cx="78" cy="18" r="4" fill={colors.primary} />
          <circle cx="122" cy="18" r="4" fill={colors.primary} />
        </g>
      )}
      {element === 'GRASS' && (
        <g>
          <path d="M100 18 Q86 40 92 58 Q104 42 100 18Z" fill={colors.secondary} />
          <path d="M100 18 Q114 40 108 58 Q96 42 100 18Z" fill={colors.primary} />
          <circle cx="70" cy="34" r="5" fill={colors.secondary} />
          <circle cx="130" cy="34" r="5" fill={colors.secondary} />
        </g>
      )}
    </svg>
  );
}
