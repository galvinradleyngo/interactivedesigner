import { Icon } from '../../app/components/Icon';
import { RichText } from '../../app/components/RichText';
import { Check, Num, Section, Select, Txt } from '../../app/components/fields';
import type { PanelProps } from '../../app/editor/types';
import { newKey } from '../../schema/migrate';
import { Scrubber } from './Scrubber';
import {
  formatTime,
  parseYouTubeId,
  sortedCheckpoints,
  type InteractiveVideoProps,
  type VideoCheckpoint,
  type VideoOption,
} from './type';

export function newCheckpoint(kind: 'prompt' | 'question', time: number): VideoCheckpoint {
  const opts: VideoOption[] = [
    { id: newKey('o'), text: 'Option A', correct: true, feedback: '' },
    { id: newKey('o'), text: 'Option B', correct: false, feedback: '' },
  ];
  return {
    id: newKey('k'),
    time,
    kind,
    title: kind === 'question' ? 'Check your understanding' : 'Note',
    html:
      kind === 'question'
        ? '<p>Type your question here</p>'
        : '<p>Type what the learner should read or think about.</p>',
    multi: false,
    options: kind === 'question' ? opts : [],
  };
}

export function InteractiveVideoPanel({
  props,
  el,
  onChange,
  sub,
  setSub,
}: PanelProps<InteractiveVideoProps>) {
  const set = (p: Partial<InteractiveVideoProps>, key?: string) =>
    onChange({ ...props, ...p }, key);
  const id = parseYouTubeId(props.url);
  const list = sortedCheckpoints(props.checkpoints);
  const sel = props.checkpoints.find((c) => c.id === sub) ?? null;
  const setCp = (cid: string, p: Partial<VideoCheckpoint>, key?: string) =>
    set({ checkpoints: props.checkpoints.map((c) => (c.id === cid ? { ...c, ...p } : c)) }, key);
  const add = (kind: 'prompt' | 'question', time: number) => {
    const c = newCheckpoint(kind, Math.max(0, time));
    set({ checkpoints: [...props.checkpoints, c] });
    setSub(c.id);
  };

  return (
    <>
      <Section title="Video">
        <Txt
          label="YouTube link"
          value={props.url}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(url) => set({ url }, `url-${el.id}`)}
        />
        {props.url.trim() && !id && (
          <p className="warn">
            That doesn’t look like a YouTube link. Paste the address of the video page.
          </p>
        )}
        {id && <p className="muted">Video found (id {id}).</p>}
        <p className="muted">
          Learners watch the video from YouTube, so they need an internet connection, and the video
          must allow embedding.
        </p>
        <Check
          label="Show captions when the video starts"
          checked={props.captions}
          onChange={(captions) => set({ captions })}
        />
        <Check
          label="Learners must answer questions correctly to continue"
          checked={props.requireCorrect}
          onChange={(requireCorrect) => set({ requireCorrect })}
        />
        <p className="muted">
          Off: any answer lets them continue, and they see whether it was right. On: they retry
          until correct (only their first try is graded).
        </p>
      </Section>

      {id && (
        <Section title="Add checkpoints by watching">
          <Scrubber videoId={id} captions={props.captions} onAdd={add} />
        </Section>
      )}

      <Section
        title={`Checkpoints (${list.length})`}
        actions={
          <div className="row">
            <button
              type="button"
              onClick={() => add('prompt', list.at(-1) ? list.at(-1)!.time + 10 : 5)}
            >
              <Icon name="plus" size={15} /> Prompt
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => add('question', list.at(-1) ? list.at(-1)!.time + 10 : 5)}
            >
              <Icon name="plus" size={15} /> Question
            </button>
          </div>
        }
      >
        {list.length === 0 && (
          <p className="muted">No checkpoints yet. Without any, the video just plays.</p>
        )}
        <ul className="itemlist">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`itembtn ${sub === c.id ? 'on' : ''}`}
                aria-pressed={sub === c.id}
                onClick={() => setSub(sub === c.id ? null : c.id)}
              >
                <span className="badge">{formatTime(c.time)}</span>{' '}
                {c.title || (c.kind === 'question' ? 'Question' : 'Note')}
                <span className="tag">{c.kind === 'question' ? 'question' : 'prompt'}</span>
              </button>
            </li>
          ))}
        </ul>

        {sel && (
          <div className="subedit">
            <Select
              label="Type"
              value={sel.kind}
              options={[
                { value: 'prompt', label: 'Prompt (read, then continue)' },
                { value: 'question', label: 'Multiple-choice question' },
              ]}
              onChange={(kind) =>
                setCp(
                  sel.id,
                  kind === 'question' && sel.options.length === 0
                    ? { kind, options: newCheckpoint('question', 0).options }
                    : { kind },
                )
              }
            />
            <Num
              label={`Time in seconds (${formatTime(sel.time)})`}
              value={sel.time}
              min={0}
              step={1}
              onChange={(time) => setCp(sel.id, { time }, `kt-${sel.id}`)}
            />
            <Txt
              label="Title"
              value={sel.title}
              onChange={(title) => setCp(sel.id, { title }, `kti-${sel.id}`)}
            />
            <RichText
              label={sel.kind === 'question' ? 'Question' : 'Prompt text'}
              value={sel.html}
              onChange={(html) => setCp(sel.id, { html }, `kh-${sel.id}`)}
            />

            {sel.kind === 'question' && (
              <>
                <Check
                  label="Several correct answers"
                  checked={sel.multi}
                  onChange={(multi) => setCp(sel.id, { multi })}
                />
                {sel.options.map((o, oi) => (
                  <div className="mc-opt" key={o.id}>
                    <input
                      type={sel.multi ? 'checkbox' : 'radio'}
                      name={`vc-${sel.id}`}
                      checked={o.correct}
                      aria-label={`Option ${oi + 1} is correct`}
                      title="Mark as correct"
                      onChange={(e) =>
                        setCp(sel.id, {
                          options: sel.options.map((x, k) =>
                            sel.multi
                              ? k === oi
                                ? { ...x, correct: e.target.checked }
                                : x
                              : { ...x, correct: k === oi },
                          ),
                        })
                      }
                    />
                    <div className="mc-opt-text">
                      <input
                        type="text"
                        value={o.text}
                        aria-label={`Option ${oi + 1} text`}
                        placeholder="Option text"
                        onChange={(e) =>
                          setCp(
                            sel.id,
                            {
                              options: sel.options.map((x, k) =>
                                k === oi ? { ...x, text: e.target.value } : x,
                              ),
                            },
                            `ko-${o.id}`,
                          )
                        }
                      />
                      <input
                        type="text"
                        value={o.feedback}
                        aria-label={`Option ${oi + 1} feedback`}
                        placeholder="Feedback when chosen (optional)"
                        onChange={(e) =>
                          setCp(
                            sel.id,
                            {
                              options: sel.options.map((x, k) =>
                                k === oi ? { ...x, feedback: e.target.value } : x,
                              ),
                            },
                            `kf-${o.id}`,
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="iconbtn danger"
                      aria-label={`Remove option ${oi + 1}`}
                      disabled={sel.options.length <= 2}
                      onClick={() =>
                        setCp(sel.id, { options: sel.options.filter((_, k) => k !== oi) })
                      }
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCp(sel.id, {
                      options: [
                        ...sel.options,
                        { id: newKey('o'), text: '', correct: false, feedback: '' },
                      ],
                    })
                  }
                >
                  <Icon name="plus" size={15} /> Add option
                </button>
              </>
            )}
            <button
              type="button"
              className="danger"
              onClick={() => {
                set({ checkpoints: props.checkpoints.filter((c) => c.id !== sel.id) });
                setSub(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete checkpoint
            </button>
          </div>
        )}
      </Section>
    </>
  );
}
