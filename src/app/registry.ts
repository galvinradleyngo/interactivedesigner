import type { ComponentType } from 'react';
import { ButtonPanel } from '../plugins/button/Panel';
import { DragDropOverlay } from '../plugins/dragDrop/Overlay';
import { DragDropPanel } from '../plugins/dragDrop/Panel';
import { FlashcardsPanel } from '../plugins/flashcards/Panel';
import { FlipCardPanel } from '../plugins/flipCard/Panel';
import { HotspotsOverlay } from '../plugins/hotspots/Overlay';
import { HotspotsPanel } from '../plugins/hotspots/Panel';
import { ImagePanel } from '../plugins/image/Panel';
import { ImageComparePanel } from '../plugins/imageCompare/Panel';
import { MultipleChoicePanel } from '../plugins/multipleChoice/Panel';
import { ShapePanel } from '../plugins/shape/Panel';
import { TextPanel } from '../plugins/text/Panel';
import { TimelinePanel } from '../plugins/timeline/Panel';
import type { OverlayProps, PanelProps } from './editor/types';

/** Editor-side half of each block plugin (inspector panel + optional on-canvas overlay). */
export interface EditorBlock {
  Panel: ComponentType<PanelProps<never>>;
  Overlay?: ComponentType<OverlayProps<never>>;
}

const cast = <P>(c: ComponentType<PanelProps<P>>) =>
  c as unknown as ComponentType<PanelProps<never>>;
const castO = <P>(c: ComponentType<OverlayProps<P>>) =>
  c as unknown as ComponentType<OverlayProps<never>>;

export const EDITOR_BLOCKS: Record<string, EditorBlock> = {
  text: { Panel: cast(TextPanel) },
  image: { Panel: cast(ImagePanel) },
  shape: { Panel: cast(ShapePanel) },
  button: { Panel: cast(ButtonPanel) },
  hotspots: { Panel: cast(HotspotsPanel), Overlay: castO(HotspotsOverlay) },
  dragDrop: { Panel: cast(DragDropPanel), Overlay: castO(DragDropOverlay) },
  flashcards: { Panel: cast(FlashcardsPanel) },
  flipCard: { Panel: cast(FlipCardPanel) },
  timeline: { Panel: cast(TimelinePanel) },
  imageCompare: { Panel: cast(ImageComparePanel) },
  multipleChoice: { Panel: cast(MultipleChoicePanel) },
};
