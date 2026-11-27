import type { BlockTypeDef } from '../types';

export interface ImageProps {
  src: string;
  alt: string;
  fit: 'cover' | 'contain' | 'fill';
  radius: number;
  opacity: number;
}

export const imageDef: BlockTypeDef<ImageProps> = {
  type: 'image',
  label: 'Image',
  description: 'A picture from your computer.',
  category: 'basic',
  icon: 'image',
  defaultSize: { w: 360, h: 240 },
  createDefault: () => ({ src: '', alt: '', fit: 'cover', radius: 0, opacity: 1 }),
};
