import type { BlockTypeDef } from '../types';

export interface ButtonProps {
  label: string;
  action: 'next' | 'prev' | 'page' | 'none';
  /** 1-based page number for action 'page'. */
  page: number;
  fill: string;
  color: string;
  fontSize: number;
  radius: number;
}

export const buttonDef: BlockTypeDef<ButtonProps> = {
  type: 'button',
  label: 'Button',
  description: 'A button that goes to the next, previous or a specific page.',
  category: 'basic',
  icon: 'button',
  defaultSize: { w: 180, h: 56 },
  createDefault: () => ({ label: 'Next', action: 'next', page: 1, fill: '', color: '#ffffff', fontSize: 22, radius: 12 }),
};
