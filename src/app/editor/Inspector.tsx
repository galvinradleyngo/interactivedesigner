import { useEffect, useState } from 'react';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { blockPoints } from '../../plugins/types';
import type {
  FontChoice,
  Page,
  ProjectDoc,
  ProjectSettings,
  ScormVersion,
  StageElement,
} from '../../schema/types';
import { Check, Color, Num, Section, Select, Txt } from '../components/fields';
import { Icon } from '../components/Icon';
import { ImagePicker } from '../components/ImagePicker';
import { EDITOR_BLOCKS } from '../registry';
import type { AlignTo, ZMove } from './model';

type Tab = 'element' | 'page' | 'project';

interface Props {
  doc: ProjectDoc;
  page: Page;
  el: StageElement | null;
  change(fn: (d: ProjectDoc) => ProjectDoc, key?: string): void;
  patchEl(patch: Partial<StageElement>, key?: string): void;
  setProps(props: Record<string, unknown>, key?: string): void;
  patchPage(patch: Partial<Page>, key?: string): void;
  addImage(file: File): Promise<string>;
  sub: string | null;
  setSub(id: string | null): void;
  startBlockEdit(): void;
  onAlign(to: AlignTo): void;
  onZ(m: ZMove): void;
  onDuplicate(): void;
  onDelete(): void;
}

const ALIGN: { to: AlignTo; icon: string; label: string }[] = [
  { to: 'left', icon: 'alignleft', label: 'Align left' },
  { to: 'center', icon: 'aligncenter', label: 'Centre horizontally' },
  { to: 'right', icon: 'alignright', label: 'Align right' },
  { to: 'top', icon: 'aligntop', label: 'Align top' },
  { to: 'middle', icon: 'alignmiddle', label: 'Centre vertically' },
  { to: 'bottom', icon: 'alignbottom', label: 'Align bottom' },
];

export function Inspector(p: Props) {
  const [tab, setTab] = useState<Tab>(p.el ? 'element' : 'page');
  const elId = p.el?.id ?? null;
  useEffect(() => setTab(elId ? 'element' : 'page'), [elId]);

  // Never show the Element tab without an element.
  const active: Tab = tab === 'element' && !p.el ? 'page' : tab;
  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'element', label: 'Element', disabled: !p.el },
    { id: 'page', label: 'Page' },
    { id: 'project', label: 'Project' },
  ];

  return (
    <aside className="right" aria-label="Properties">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            disabled={t.disabled}
            aria-selected={active === t.id}
            className={active === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabpanel" role="tabpanel">
        {active === 'element' && p.el && <ElementTab {...p} el={p.el} />}
        {active === 'page' && <PageTab {...p} />}
        {active === 'project' && <ProjectTab {...p} />}
      </div>
    </aside>
  );
}

function ElementTab(p: Props & { el: StageElement }) {
  const { el, doc } = p;
  const def = DEFS_BY_TYPE.get(el.type);
  const block = EDITOR_BLOCKS[el.type];
  if (!def || !block) return <p className="muted">Unknown element type “{el.type}”.</p>;
  const props = { ...def.createDefault(), ...el.props };
  const Panel = block.Panel;
  const scorable = !!def.fraction;
  const scored = def.isScored?.(props) ?? false;
  const pos = (patch: Partial<StageElement>) => p.patchEl(patch, `pos-${el.id}`);

  return (
    <>
      <div className="el-head">
        <span className="acticon">
          <Icon name={def.icon} size={20} />
        </span>
        <div>
          <strong>{def.label}</strong>
          <input
            className="nameinput"
            aria-label="Layer name"
            placeholder="Name (optional)"
            value={el.name ?? ''}
            onChange={(e) => p.patchEl({ name: e.target.value }, `name-${el.id}`)}
          />
        </div>
      </div>

      <Section title="Position & size">
        <div className="grid4">
          <Num label="X" value={el.x} onChange={(x) => pos({ x })} />
          <Num label="Y" value={el.y} onChange={(y) => pos({ y })} />
          <Num label="Width" value={el.w} min={16} onChange={(w) => pos({ w })} />
          <Num label="Height" value={el.h} min={16} onChange={(h) => pos({ h })} />
        </div>
        <div className="iconrow" role="group" aria-label="Align to page">
          {ALIGN.map((a) => (
            <button
              key={a.to}
              type="button"
              className="iconbtn"
              title={a.label}
              aria-label={a.label}
              onClick={() => p.onAlign(a.to)}
            >
              <Icon name={a.icon} size={16} />
            </button>
          ))}
        </div>
        <div className="iconrow" role="group" aria-label="Arrange">
          <button type="button" onClick={() => p.onZ('front')}>
            <Icon name="front" size={15} /> To front
          </button>
          <button type="button" onClick={() => p.onZ('forward')}>
            <Icon name="up" size={15} /> Forward
          </button>
          <button type="button" onClick={() => p.onZ('backward')}>
            <Icon name="down" size={15} /> Backward
          </button>
          <button type="button" onClick={() => p.onZ('back')}>
            <Icon name="back2" size={15} /> To back
          </button>
        </div>
        <div className="iconrow">
          <button
            type="button"
            onClick={() => p.patchEl({ locked: !el.locked })}
            aria-pressed={!!el.locked}
          >
            <Icon name={el.locked ? 'lock' : 'unlock'} size={15} /> {el.locked ? 'Locked' : 'Lock'}
          </button>
          <button type="button" onClick={() => p.patchEl({ hidden: !el.hidden })}>
            <Icon name={el.hidden ? 'eyeoff' : 'eye'} size={15} /> {el.hidden ? 'Hidden' : 'Hide'}
          </button>
          <button type="button" onClick={p.onDuplicate}>
            <Icon name="copy" size={15} /> Duplicate
          </button>
          <button type="button" className="danger" onClick={p.onDelete}>
            <Icon name="trash" size={15} /> Delete
          </button>
        </div>
      </Section>

      {scorable && (
        <Section title="Scoring">
          <Num
            label="Points"
            value={blockPoints(el.props)}
            min={0}
            max={1000}
            onChange={(points) => p.setProps({ ...el.props, points }, `pts-${el.id}`)}
          />
          <p className={scored ? 'muted' : 'warn'}>
            {scored
              ? 'Counts toward the project score (the total of all scored activities).'
              : 'Not scored right now. Change the mode or mark correct answers to score it.'}
          </p>
        </Section>
      )}

      <Panel
        props={props as never}
        el={el}
        doc={doc}
        onChange={((next: Record<string, unknown>, key?: string) => p.setProps(next, key)) as never}
        patchEl={p.patchEl}
        addImage={p.addImage}
        sub={p.sub}
        setSub={p.setSub}
        startBlockEdit={p.startBlockEdit}
      />
    </>
  );
}

function PageTab(p: Props) {
  const { page, doc } = p;
  const inheritBg = page.background === undefined;
  const inheritImg = page.backgroundImage === undefined;
  return (
    <>
      <Section title="This page">
        <Txt
          label="Page name"
          value={page.name}
          onChange={(name) => p.patchPage({ name }, `pn-${page.id}`)}
        />
      </Section>
      <Section title="Background">
        <Check
          label="Use the project background colour"
          checked={inheritBg}
          onChange={(v) => p.patchPage({ background: v ? undefined : doc.design.background })}
        />
        {!inheritBg && (
          <Color
            label="Background colour"
            value={page.background ?? doc.design.background}
            onChange={(background) => p.patchPage({ background }, `pb-${page.id}`)}
          />
        )}
        <Check
          label="Use the project background picture"
          checked={inheritImg}
          onChange={(v) => p.patchPage({ backgroundImage: v ? undefined : null })}
        />
        {!inheritImg && (
          <ImagePicker
            label="Background picture"
            value={page.backgroundImage}
            media={doc.media}
            addImage={p.addImage}
            onChange={(backgroundImage) => p.patchPage({ backgroundImage })}
          />
        )}
      </Section>
    </>
  );
}

function ProjectTab(p: Props) {
  const { doc } = p;
  const s = doc.settings;
  const d = doc.design;
  const setS = (patch: Partial<ProjectSettings>, key?: string) =>
    p.change((x) => ({ ...x, settings: { ...x.settings, ...patch } }), key);
  const setD = (patch: Partial<typeof d>, key?: string) =>
    p.change((x) => ({ ...x, design: { ...x.design, ...patch } }), key);
  return (
    <>
      <Section title="Project">
        <Txt
          label="Title (also the zip file name)"
          value={doc.title}
          onChange={(title) => p.change((x) => ({ ...x, title }), 'title')}
        />
      </Section>
      <Section title="Scoring & SCORM">
        <Num
          label="Passing score"
          value={s.passingScore}
          min={0}
          max={100}
          suffix="%"
          onChange={(passingScore) => setS({ passingScore }, 'pass')}
        />
        <Select<ScormVersion>
          label="SCORM version"
          value={s.scormVersion}
          options={[
            { value: '2004', label: 'SCORM 2004 4th Edition' },
            { value: '1.2', label: 'SCORM 1.2' },
          ]}
          onChange={(scormVersion) => setS({ scormVersion })}
        />
        <Check
          label="Show feedback (right/wrong) to learners"
          checked={s.showFeedback}
          onChange={(showFeedback) => setS({ showFeedback })}
        />
        <Check
          label="Allow learners to retry"
          checked={s.allowRetry}
          onChange={(allowRetry) => setS({ allowRetry })}
        />
        <p className="muted">The score is the total of every scored activity’s points.</p>
      </Section>
      <Section title="Look">
        <div className="grid2">
          <Color
            label="Accent colour"
            value={d.primary}
            fallback="#4f46e5"
            onChange={(primary) => setD({ primary }, 'primary')}
          />
          <Color
            label="Text colour"
            value={d.text}
            fallback="#1f2937"
            onChange={(text) => setD({ text }, 'text')}
          />
          <Color
            label="Page background"
            value={d.background}
            fallback="#ffffff"
            onChange={(background) => setD({ background }, 'bg')}
          />
          <Num
            label="Corner radius"
            value={d.radius}
            min={0}
            max={40}
            onChange={(radius) => setD({ radius }, 'radius')}
          />
        </div>
        <Select<FontChoice>
          label="Font"
          value={d.font}
          options={[
            { value: 'system', label: 'Sans-serif' },
            { value: 'serif', label: 'Serif' },
            { value: 'rounded', label: 'Rounded' },
            { value: 'mono', label: 'Monospace' },
          ]}
          onChange={(font) => setD({ font })}
        />
        <ImagePicker
          label="Background picture (all pages)"
          value={d.backgroundImage}
          media={doc.media}
          addImage={p.addImage}
          onChange={(backgroundImage) => setD({ backgroundImage })}
        />
      </Section>
    </>
  );
}
