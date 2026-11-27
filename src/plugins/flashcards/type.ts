import type { BlockTypeDef } from '../types';

export interface CardFace {
  text: string;
  image: string | null;
}
export interface Card {
  id: string;
  front: CardFace;
  back: CardFace;
}
export interface FlashProps {
  cards: Card[];
  shuffle: boolean;
  frontColor: string;
  backColor: string;
  textColor: string;
}

export const flashcardsDef: BlockTypeDef<FlashProps> = {
  type: 'flashcards',
  label: 'Flash cards',
  description: 'Two-sided cards for studying terms, translations and pairs.',
  category: 'interaction',
  icon: 'cards',
  defaultSize: { w: 480, h: 320 },
  createDefault: () => ({
    cards: [
      {
        id: 'c1',
        front: { text: 'Front of card 1', image: null },
        back: { text: 'Back of card 1', image: null },
      },
      {
        id: 'c2',
        front: { text: 'Front of card 2', image: null },
        back: { text: 'Back of card 2', image: null },
      },
    ],
    shuffle: false,
    frontColor: '#4f46e5',
    backColor: '#0f766e',
    textColor: '#ffffff',
  }),
};
