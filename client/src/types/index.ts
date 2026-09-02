export type Screen = 'matchmaking' | 'starter' | 'battle' | 'gameover';

export interface FloatingNumber {
  id: number;
  side: 'self' | 'opponent';
  value: number;
  kind: 'damage' | 'heal' | 'energy' | 'buff';
  label?: string;
}

export type PetAnimState =
  | 'idle'
  | 'attack'
  | 'hit'
  | 'death'
  | 'switch'
  | 'heal';
