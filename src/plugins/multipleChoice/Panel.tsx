import { Icon } from '../../app/components/Icon';
import { RichText } from '../../app/components/RichText';
import { Check, Section } from '../../app/components/fields';
import type { PanelProps } from '../../app/editor/types';
import { newQuestion, uid, type McProps, type McQuestion } from './type';

export function MultipleChoicePanel({ props, el, onChange }: PanelProps<McProps>) {
  const set = (p: Partial<McProps>, key?: string) => onChange({ ...props, ...p }, key);
  const setQ = (i: number, patch: Partial<McQuestion>, key?: string) =>
    set({ questions: props.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) }, key);
  const move = (i: number, d: number) => {
    const qs = [...props.questions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j] as McQuestion, qs[i] as McQuestion];
    set({ questions: qs });
  };

  return (
    <>
      <Section title="Introduction (optional)">
        <RichText
          label="Introduction"
          value={props.intro}
          onChange={(intro) => set({ intro }, `intro-${el.id}`)}
        />
      </Section>
      {props.questions.map((q, qi) => (
        <Section
          key={q.id}
          title={`Question ${qi + 1}`}
          actions={
            <div className="row">
              <button
                type="button"
                className="iconbtn"
                aria-label="Move question up"
                disabled={qi === 0}
                onClick={() => move(qi, -1)}
              >
                <Icon name="up" size={14} />
              </button>
              <button
                type="button"
                className="iconbtn"
                aria-label="Move question down"
                disabled={qi === props.questions.length - 1}
                onClick={() => move(qi, 1)}
              >
                <Icon name="down" size={14} />
              </button>
              <button
                type="button"
                className="iconbtn danger"
                aria-label="Delete question"
                disabled={props.questions.length === 1}
                onClick={() => set({ questions: props.questions.filter((_, k) => k !== qi) })}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          }
        >
          <RichText
            label={`Question ${qi + 1} text`}
            value={q.text}
            onChange={(text) => setQ(qi, { text }, `qt-${q.id}`)}
          />
          <div className="row wrap">
            <Check
              label="Several correct answers"
              checked={q.multi}
              onChange={(multi) => setQ(qi, { multi })}
            />
            <Check
              label="Shuffle options"
              checked={q.shuffle}
              onChange={(shuffle) => setQ(qi, { shuffle })}
            />
          </div>
          {q.options.map((o, oi) => (
            <div className="mc-opt" key={o.id}>
              <input
                type={q.multi ? 'checkbox' : 'radio'}
                name={`correct-${q.id}`}
                checked={o.correct}
                aria-label={`Option ${oi + 1} is correct`}
                title="Mark as correct"
                onChange={(e) =>
                  setQ(qi, {
                    options: q.options.map((x, k) =>
                      q.multi
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
                    setQ(
                      qi,
                      {
                        options: q.options.map((x, k) =>
                          k === oi ? { ...x, text: e.target.value } : x,
                        ),
                      },
                      `ot-${o.id}`,
                    )
                  }
                />
                <input
                  type="text"
                  value={o.feedback}
                  aria-label={`Option ${oi + 1} feedback`}
                  placeholder="Feedback when chosen (optional)"
                  onChange={(e) =>
                    setQ(
                      qi,
                      {
                        options: q.options.map((x, k) =>
                          k === oi ? { ...x, feedback: e.target.value } : x,
                        ),
                      },
                      `of-${o.id}`,
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="iconbtn danger"
                aria-label={`Remove option ${oi + 1}`}
                disabled={q.options.length <= 2}
                onClick={() => setQ(qi, { options: q.options.filter((_, k) => k !== oi) })}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setQ(qi, {
                options: [...q.options, { id: uid('o'), text: '', correct: false, feedback: '' }],
              })
            }
          >
            <Icon name="plus" size={15} /> Add option
          </button>
        </Section>
      ))}
      <button
        type="button"
        className="primary wide"
        onClick={() => set({ questions: [...props.questions, newQuestion()] })}
      >
        <Icon name="plus" size={15} /> Add question
      </button>
    </>
  );
}
