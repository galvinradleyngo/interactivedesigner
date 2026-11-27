import type { BlockTypeDef } from '../types';

export interface FlipFace {
  fill: string;
  text: string;
  textColor: string;
  fontSize: number;
  /** `media:<id>` reference or null. */
  image: string | null;
  /** background: picture fills the face with text over it. top: picture above the text. */
  imageLayout: 'background' | 'top';
}

export interface FlipCardProps {
  shape: 'rect' | 'rounded' | 'ellipse';
  /** Which way the card turns over. */
  direction: 'horizontal' | 'vertical';
  /** Clicking again turns it back. */
  flipBack: boolean;
  radius: number;
  front: FlipFace;
  back: FlipFace;
}

export const face = (over: Partial<FlipFace> = {}): FlipFace => ({
  fill: '#4f46e5',
  text: '',
  textColor: '#ffffff',
  fontSize: 26,
  image: null,
  imageLayout: 'background',
  ...over,
});

export const flipCardDef: BlockTypeDef<FlipCardProps> = {
  type: 'flipCard',
  label: 'Flip card',
  description:
    'A shape with text and/or a picture that turns over when clicked to reveal the back.',
  category: 'activity',
  icon: 'flip',
  defaultSize: { w: 260, h: 180 },
  createDefault: () => ({
    shape: 'rounded',
    direction: 'horizontal',
    flipBack: true,
    radius: 18,
    front: face({ text: 'Click to flip', fill: '#4f46e5' }),
    back: face({ text: 'The answer is here', fill: '#0f766e' }),
  }),
};
