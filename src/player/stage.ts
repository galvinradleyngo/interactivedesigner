import { DEFS_BY_TYPE } from '../plugins/defs';
import { isGraded, type BlockContext } from '../plugins/types';
import {
  STAGE_H,
  STAGE_W,
  stageHeight,
  type Design,
  type Page,
  type ProjectDoc,
  type StageElement,
} from '../schema/types';
import { getBlockPlayer } from './registry';

export const FONTS: Record<Design['font'], string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, Consolas, "Courier New", monospace',
};

/** Everything a block needs from its host (the runtime or the editor canvas). */
export interface StageEnv {
  project: ProjectDoc;
  editing: boolean;
  /** Show author hints for unfinished blocks. Defaults to `editing`. */
  hints?: boolean;
  resolveMedia(ref: unknown): string;
  getState?(id: string): unknown;
  setState?(id: string, s: unknown): void;
  report?(id: string, r: { fraction: number; done: boolean }): void;
  goto?(target: 'next' | 'prev' | number): void;
}

export function makeMediaResolver(project: ProjectDoc): (ref: unknown) => string {
  const map = new Map(project.media.map((m) => [m.id, m.src]));
  return (ref) => {
    if (typeof ref !== 'string' || !ref) return '';
    return ref.startsWith('media:') ? (map.get(ref.slice(6)) ?? '') : ref;
  };
}

/** Theme variables on the player root (also used by the editor canvas). */
export function applyTheme(root: HTMLElement, design: Design): void {
  const s = root.style;
  s.setProperty('--primary', design.primary);
  s.setProperty('--text', design.text);
  s.setProperty('--radius', `${design.radius}px`);
  s.setProperty('--font', FONTS[design.font] ?? FONTS.system);
}

/** Give a stage element the project's page shape. */
export function applyStageShape(stage: HTMLElement, design: Design): void {
  stage.style.aspectRatio = `${STAGE_W} / ${stageHeight(design)}`;
}

/** Page background (colour + optional image), falling back to project design. */
export function applyPageBackground(
  stage: HTMLElement,
  page: Page,
  design: Design,
  resolve: (r: unknown) => string,
): void {
  stage.style.backgroundColor = page.background ?? design.background;
  const img = page.backgroundImage === undefined ? design.backgroundImage : page.backgroundImage;
  const url = img ? resolve(img) : '';
  stage.style.backgroundImage = url ? `url("${url}")` : '';
}

/** Position an element's wrapper from its logical rect (percent so it scales with the stage). */
export function applyRect(
  node: HTMLElement,
  el: Pick<StageElement, 'x' | 'y' | 'w' | 'h'>,
  stageH: number = STAGE_H,
): void {
  node.style.left = `${(el.x / STAGE_W) * 100}%`;
  node.style.top = `${(el.y / stageH) * 100}%`;
  node.style.width = `${(el.w / STAGE_W) * 100}%`;
  node.style.height = `${(el.h / stageH) * 100}%`;
}

/** Render one block into `root` using its player plugin. */
export function renderBlock(root: HTMLElement, el: StageElement, env: StageEnv): void {
  root.replaceChildren();
  root.className = `ap-block ap-block-${el.type}`;
  const player = getBlockPlayer(el.type);
  if (!player) {
    root.textContent = `Unknown block: ${el.type}`;
    return;
  }
  const defaults = DEFS_BY_TYPE.get(el.type)?.createDefault() ?? {};
  const ctx: BlockContext = {
    root,
    el,
    props: { ...defaults, ...el.props },
    settings: env.project.settings,
    design: env.project.design,
    editing: env.editing,
    hints: env.hints ?? env.editing,
    graded: isGraded(env.project.settings, el.props),
    resolveMedia: env.resolveMedia,
    state: env.getState?.(el.id) ?? null,
    setState: (s) => env.setState?.(el.id, s),
    report: (r) => env.report?.(el.id, r),
    goto: (t) => env.goto?.(t),
  };
  player.render(ctx);
}

/** Create the positioned wrapper + block for the player runtime. */
export function paintElement(parent: HTMLElement, el: StageElement, env: StageEnv): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'ap-el';
  wrap.dataset.id = el.id;
  applyRect(wrap, el, stageHeight(env.project.design));
  const block = document.createElement('div');
  wrap.append(block);
  parent.append(wrap);
  renderBlock(block, el, env);
  return wrap;
}
