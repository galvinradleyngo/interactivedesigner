import type { BlockTypeDef } from '../types';

export interface ShapeProps {
  shape: 'rect' | 'ellipse';
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  opacity: number;
}

export const shapeDef: BlockTypeDef<ShapeProps> = {
  type: 'shape',
  label: 'Shape',
  description: 'Rectangle or ellipse for backgrounds and decoration.',
  category: 'basic',
  icon: 'shape',
  defaultSize: { w: 240, h: 160 },
  createDefault: () => ({
    shape: 'rect',
    fill: '#e0e7ff',
    stroke: '',
    strokeWidth: 0,
    radius: 16,
    opacity: 1,
  }),
};
