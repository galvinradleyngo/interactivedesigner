import { useEffect, useState } from 'react';
import { DEFS_BY_TYPE } from '../../plugins/defs';
import { blockPoints } from '../../plugins/types';
import { PAGE_SHAPES, type PageShape } from '../../schema/types';
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

export type InspectorTab = 'element' | 'page' | 'grading' | 'settings';
type Tab = InspectorTab;

interface Props {
  /** Ask the inspector to show a tab (n changes each time so the same tab can be requested again). */
  openTab?: { tab: InspectorTab; n: number };
  /** Jump to an interaction on another page. */
  onGo(pageId: string, elementId: string): void;
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
  peek: boolean;
  setPeek(v: boolean): void;
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
  const requested = p.openTab;
  useEffect(() => {
    if (requested) setTab(requested.tab);
  }, [requested]);

  // Never show the Element tab without an element.
  const active: Tab = tab === 'element' && !p.el ? 'page' : tab;
  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'element', label: 'Element', disabled: !p.el },
    { id: 'page', label: 'Page' },
    { id: 'grading', label: 'Grading' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <aside className={`right ${p.el ? 'has-el' : ''}`} aria-label="Properties">
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
        {active === 'grading' && <GradingTab {...p} />}
        {active === 'settings' && <SettingsTab {...p} />}
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
  const gradable = !!def.gradable && doc.settings.graded;
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

      <Section title="Position & size" defaultOpen={false}>
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

      {gradable && (
        <Section title="Grading">
          <Check
            label="Counts toward the grade"
            checked={el.props.graded !== false}
            onChange={(graded) => p.setProps({ ...el.props, graded })}
          />
          {el.props.graded !== false && (
            <Num
              label="Points"
              value={blockPoints(el.props)}
              min={0}
              max={1000}
              onChange={(points) => p.setProps({ ...el.props, points }, `pts-${el.id}`)}
            />
          )}
          {el.props.graded !== false && block.Grading && (
            <block.Grading
              props={props as never}
              onChange={
                ((next: Record<string, unknown>, key?: string) => p.setProps(next, key)) as never
              }
            />
          )}
          {el.props.graded !== false && !scored && !block.Grading && (
            <p className="warn">Not graded yet: mark which answers are correct.</p>
          )}
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
        peek={p.peek}
        setPeek={p.setPeek}
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
          label="Use the activity background colour"
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
          label="Use the activity background picture"
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

function GradingTab(p: Props) {
  const { doc } = p;
  const s = doc.settings;
  const setS = (patch: Partial<ProjectSettings>, key?: string) =>
    p.change((x) => ({ ...x, settings: { ...x.settings, ...patch } }), key);
  const rows = doc.pages.flatMap((pg) =>
    pg.elements
      .filter((e) => DEFS_BY_TYPE.get(e.type)?.gradable)
      .map((e) => ({ page: pg, el: e, def: DEFS_BY_TYPE.get(e.type) })),
  );
  const counted = rows.filter((r) => r.el.props.graded !== false);
  const total = counted.reduce((n, r) => n + blockPoints(r.el.props), 0);
  const setRow = (pageId: string, elId: string, patch: Record<string, unknown>, key?: string) =>
    p.change(
      (x) => ({
        ...x,
        pages: x.pages.map((pg) =>
          pg.id !== pageId
            ? pg
            : {
                ...pg,
                elements: pg.elements.map((e) =>
                  e.id === elId ? { ...e, props: { ...e.props, ...patch } } : e,
                ),
              },
        ),
      }),
      key,
    );

  return (
    <>
      <Section title="Grading">
        <label className={`bigswitch ${s.graded ? 'on' : ''}`}>
          <input
            type="checkbox"
            role="switch"
            checked={s.graded}
            onChange={(e) => setS({ graded: e.target.checked })}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-knob" />
          </span>
          <span>
            <strong>{s.graded ? 'Graded' : 'Not graded'}</strong>
            <small>
              {s.graded
                ? 'Learners get a score. It is sent to the LMS gradebook.'
                : 'No scores, points or pass/fail. Only completion is reported.'}
            </small>
          </span>
        </label>
        <p className="muted">
          Only multiple choice, drag and drop and the questions in an interactive video can be
          graded. Hotspots, flip cards, timelines and the comparison slider are for learning, not
          marks.
        </p>
      </Section>

      {s.graded && (
        <>
          <Section title="Pass mark">
            <Num
              label="Passing score"
              value={s.passingScore}
              min={0}
              max={100}
              suffix="%"
              onChange={(passingScore) => setS({ passingScore }, 'pass')}
            />
          </Section>
          <Section title={`Graded interactions (${counted.length})`}>
            {rows.length === 0 ? (
              <p className="warn">
                Nothing to grade yet. Add a <strong>Multiple choice</strong> or{' '}
                <strong>Drag and drop</strong> interaction on any page.
              </p>
            ) : (
              <>
                <ul className="gradelist">
                  {rows.map(({ page, el, def }) => {
                    const on = el.props.graded !== false;
                    const Extra = EDITOR_BLOCKS[el.type]?.Grading;
                    return (
                      <li key={el.id}>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={on}
                            aria-label={`${def?.label} on ${page.name} counts toward the grade`}
                            onChange={(e) => setRow(page.id, el.id, { graded: e.target.checked })}
                          />
                        </label>
                        <button
                          type="button"
                          className="link"
                          onClick={() => p.onGo(page.id, el.id)}
                        >
                          {page.name} · {el.name || def?.label}
                        </button>
                        {on && (
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            className="pts"
                            aria-label={`Points for ${def?.label} on ${page.name}`}
                            value={blockPoints(el.props)}
                            onChange={(e) =>
                              setRow(
                                page.id,
                                el.id,
                                { points: Math.max(0, Number(e.target.value) || 0) },
                                `pts-${el.id}`,
                              )
                            }
                          />
                        )}
                        {on && Extra && (
                          <div className="gradeextra">
                            <Extra
                              props={{ ...def?.createDefault(), ...el.props } as never}
                              onChange={
                                ((next: Record<string, unknown>, key?: string) =>
                                  setRow(page.id, el.id, next, key)) as never
                              }
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="muted">
                  Total: <strong>{total} points</strong>. The learner’s score is the share of these
                  points they earn.
                </p>
              </>
            )}
          </Section>
        </>
      )}
    </>
  );
}

function SettingsTab(p: Props) {
  const { doc } = p;
  const s = doc.settings;
  const d = doc.design;
  const setS = (patch: Partial<ProjectSettings>, key?: string) =>
    p.change((x) => ({ ...x, settings: { ...x.settings, ...patch } }), key);
  const setD = (patch: Partial<typeof d>, key?: string) =>
    p.change((x) => ({ ...x, design: { ...x.design, ...patch } }), key);
  return (
    <>
      <Section title="Activity">
        <Txt
          label="Title (also the zip file name)"
          value={doc.title}
          onChange={(title) => p.change((x) => ({ ...x, title }), 'title')}
        />
      </Section>
      <Section title="Learners and the LMS">
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
      </Section>
      <Section title="Page shape">
        <Select<PageShape>
          label="Shape of every page"
          value={d.pageShape ?? '16:9'}
          options={PAGE_SHAPES.map((s) => ({ value: s.id, label: `${s.label} (${s.hint})` }))}
          onChange={(pageShape) => setD({ pageShape })}
        />
        <p className="muted">
          Pick the shape that matches how learners will hold their device, then use Preview to try
          Desktop, Tablet and Phone. Changing it keeps each element’s position, so check that
          nothing ended up off the page.
        </p>
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
        <Color
          label="Background around the page"
          value={d.surround ?? ''}
          fallback="#eef0f6"
          clearable
          onChange={(surround) => setD({ surround }, 'surround')}
        />
        <p className="muted">
          Empty means transparent, so the page blends with the course page it is shown in.
        </p>
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
