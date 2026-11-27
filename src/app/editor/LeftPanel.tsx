import { useState } from 'react';
import { BLOCK_DEFS, DEFS_BY_TYPE } from '../../plugins/defs';
import type { Page, ProjectDoc } from '../../schema/types';
import { Icon } from '../components/Icon';
import { PageThumb } from '../components/PageThumb';

type Tab = 'add' | 'pages' | 'layers';

interface Props {
  doc: ProjectDoc;
  page: Page;
  pageId: string;
  selectedId: string | null;
  onAdd(type: string): void;
  onSelectPage(id: string): void;
  onSelectEl(id: string): void;
  onAddPage(): void;
  onDuplicatePage(id: string): void;
  onDeletePage(id: string): void;
  onMovePage(id: string, d: -1 | 1): void;
  onRenamePage(id: string, name: string): void;
  onToggle(id: string, field: 'locked' | 'hidden'): void;
  onZ(id: string, move: 'forward' | 'backward'): void;
}

const dragType = (e: React.DragEvent, type: string) => {
  e.dataTransfer.setData('application/x-id-block', type);
  e.dataTransfer.effectAllowed = 'copy';
};

export function LeftPanel(p: Props) {
  const [tab, setTab] = useState<Tab>('add');
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: 'plus' },
    { id: 'pages', label: 'Pages', icon: 'page' },
    { id: 'layers', label: 'Layers', icon: 'layers' },
  ];
  const basic = BLOCK_DEFS.filter((d) => d.category === 'basic');
  const acts = BLOCK_DEFS.filter((d) => d.category === 'interaction');

  return (
    <aside className="left" aria-label="Add, pages and layers">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="tabpanel" role="tabpanel">
          <p className="dragtip">Click to add, or drag onto the page.</p>
          <h3 className="group">Elements</h3>
          <div className="addgrid">
            {basic.map((d) => (
              <button
                key={d.type}
                type="button"
                className="addtile"
                draggable
                onDragStart={(e) => dragType(e, d.type)}
                onClick={() => p.onAdd(d.type)}
                title={d.description}
              >
                <Icon name={d.icon} size={22} />
                <span>{d.label}</span>
              </button>
            ))}
          </div>
          <h3 className="group">Interactions</h3>
          <ul className="actlist">
            {acts.map((d) => (
              <li key={d.type}>
                <button
                  type="button"
                  className="actcard"
                  draggable
                  onDragStart={(e) => dragType(e, d.type)}
                  onClick={() => p.onAdd(d.type)}
                >
                  <span className="acticon">
                    <Icon name={d.icon} size={22} />
                  </span>
                  <span>
                    <strong>{d.label}</strong>
                    <small>{d.description}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'pages' && (
        <div className="tabpanel" role="tabpanel">
          <ul className="pagelist">
            {p.doc.pages.map((pg, i) => (
              <li key={pg.id} className={pg.id === p.pageId ? 'on' : ''}>
                <button
                  type="button"
                  className="pagebtn"
                  onClick={() => p.onSelectPage(pg.id)}
                  aria-label={`Open page ${i + 1}: ${pg.name}`}
                  aria-current={pg.id === p.pageId}
                >
                  <PageThumb doc={p.doc} page={pg} />
                </button>
                <div className="pagemeta">
                  <span className="badge">{i + 1}</span>
                  <input
                    aria-label={`Page ${i + 1} name`}
                    value={pg.name}
                    onChange={(e) => p.onRenamePage(pg.id, e.target.value)}
                  />
                </div>
                {pg.id === p.pageId && (
                  <div className="row pageactions">
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label="Move page up"
                      disabled={i === 0}
                      onClick={() => p.onMovePage(pg.id, -1)}
                    >
                      <Icon name="up" size={14} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label="Move page down"
                      disabled={i === p.doc.pages.length - 1}
                      onClick={() => p.onMovePage(pg.id, 1)}
                    >
                      <Icon name="down" size={14} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label="Duplicate page"
                      onClick={() => p.onDuplicatePage(pg.id)}
                    >
                      <Icon name="copy" size={14} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn danger"
                      aria-label="Delete page"
                      disabled={p.doc.pages.length === 1}
                      onClick={() => p.onDeletePage(pg.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="primary wide" onClick={p.onAddPage}>
            <Icon name="plus" size={15} /> Add page
          </button>
        </div>
      )}

      {tab === 'layers' && (
        <div className="tabpanel" role="tabpanel">
          <p className="muted">Top of the list is in front.</p>
          {p.page.elements.length === 0 && <p className="muted">Nothing on this page yet.</p>}
          <ul className="layers">
            {[...p.page.elements].reverse().map((el) => {
              const def = DEFS_BY_TYPE.get(el.type);
              return (
                <li
                  key={el.id}
                  className={`${el.id === p.selectedId ? 'on' : ''} ${el.hidden ? 'dim' : ''}`}
                >
                  <button
                    type="button"
                    className="layername"
                    onClick={() => p.onSelectEl(el.id)}
                    aria-pressed={el.id === p.selectedId}
                  >
                    <Icon name={def?.icon ?? 'shape'} size={16} />{' '}
                    {el.name || def?.label || el.type}
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label={el.hidden ? 'Show' : 'Hide'}
                    onClick={() => p.onToggle(el.id, 'hidden')}
                  >
                    <Icon name={el.hidden ? 'eyeoff' : 'eye'} size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label={el.locked ? 'Unlock' : 'Lock'}
                    onClick={() => p.onToggle(el.id, 'locked')}
                  >
                    <Icon name={el.locked ? 'lock' : 'unlock'} size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="Bring forward"
                    onClick={() => p.onZ(el.id, 'forward')}
                  >
                    <Icon name="up" size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="Send backward"
                    onClick={() => p.onZ(el.id, 'backward')}
                  >
                    <Icon name="down" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
