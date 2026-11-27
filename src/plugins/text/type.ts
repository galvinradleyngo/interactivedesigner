import type { BlockTypeDef } from '../types';

export interface TextProps {
  html: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fill: string;
  padding: number;
}

export const textDef: BlockTypeDef<TextProps> = {
  type: 'text',
  label: 'Text',
  description: 'Formatted text. Double-click it on the canvas to edit.',
  category: 'basic',
  icon: 'text',
  defaultSize: { w: 420, h: 90 },
  createDefault: () => ({
    html: '<p>Double-click to edit</p>',
    fontSize: 28,
    color: '',
    align: 'left',
    fill: '',
    padding: 8,
  }),
};
