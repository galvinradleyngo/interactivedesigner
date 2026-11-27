import type { BlockPlayer } from '../plugins/types';
import { buttonPlayer } from '../plugins/button/player';
import { dragDropPlayer } from '../plugins/dragDrop/player';
import { flashcardsPlayer } from '../plugins/flashcards/player';
import { flipCardPlayer } from '../plugins/flipCard/player';
import { hotspotsPlayer } from '../plugins/hotspots/player';
import { imagePlayer } from '../plugins/image/player';
import { imageComparePlayer } from '../plugins/imageCompare/player';
import { multipleChoicePlayer } from '../plugins/multipleChoice/player';
import { shapePlayer } from '../plugins/shape/player';
import { textPlayer } from '../plugins/text/player';
import { timelinePlayer } from '../plugins/timeline/player';

const players = [
  textPlayer,
  imagePlayer,
  shapePlayer,
  buttonPlayer,
  hotspotsPlayer,
  dragDropPlayer,
  flashcardsPlayer,
  flipCardPlayer,
  timelinePlayer,
  imageComparePlayer,
  multipleChoicePlayer,
] as unknown as BlockPlayer[];

const byType = new Map(players.map((p) => [p.type, p]));
export const getBlockPlayer = (type: string): BlockPlayer | undefined => byType.get(type);
