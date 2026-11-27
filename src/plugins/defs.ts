import type { BlockTypeDef } from './types';
import { buttonDef } from './button/type';
import { dragDropDef } from './dragDrop/type';
import { flipCardDef } from './flipCard/type';
import { hotspotsDef } from './hotspots/type';
import { imageDef } from './image/type';
import { imageCompareDef } from './imageCompare/type';
import { interactiveVideoDef } from './interactiveVideo/type';
import { multipleChoiceDef } from './multipleChoice/type';
import { shapeDef } from './shape/type';
import { textDef } from './text/type';
import { timelineDef } from './timeline/type';

/** Framework-free block definitions (shared by the player, scoring and the editor). */
export const BLOCK_DEFS: BlockTypeDef[] = [
  textDef,
  imageDef,
  shapeDef,
  buttonDef,
  hotspotsDef,
  dragDropDef,
  flipCardDef,
  interactiveVideoDef,
  timelineDef,
  imageCompareDef,
  multipleChoiceDef,
] as unknown as BlockTypeDef[];

export const DEFS_BY_TYPE: ReadonlyMap<string, BlockTypeDef> = new Map(
  BLOCK_DEFS.map((d) => [d.type, d]),
);
