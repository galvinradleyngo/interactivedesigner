import { RichText } from '../../app/components/RichText';
import type { EditorProps } from '../../app/registry';
import { newQuestion, uid, type McContent, type McQuestion } from './type';

export function MultipleChoiceEditor({ content, onChange }: EditorProps<McContent>) {
  const setQ = (i: number, patch: Partial<McQuestion>) =>
    onChange({
      ...content,
      questions: content.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)),
    });
  const move = (i: number, d: number) => {
    const qs = [...content.questions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j] as McQuestion, qs[i] as McQuestion];
    onChange({ ...content, questions: qs });
  };

  return (
    <div className="stack">
      <section className="panel">
        <h3>Introduction (optional)</h3>
        <RichText
          label="Introduction"
          value={content.intro}
          onChange={(intro) => onChange({ ...content, intro })}
        />
      </section>

      {content.questions.map((q, qi) => (
        <section className="panel" key={q.id} aria-label={`Question ${qi + 1}`}>
          <div className="row between">
            <h3>Question {qi + 1}</h3>
            <div className="row">
              <button
                type="button"
                onClick={() => move(qi, -1)}
                disabled={qi === 0}
                aria-label="Move question up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(qi, 1)}
                disabled={qi === content.questions.length - 1}
                aria-label="Move question down"
              >
                ↓
              </button>
              <button
                type="button"
                className="danger"
                disabled={content.questions.length === 1}
                onClick={() =>
                  onChange({ ...content, questions: content.questions.filter((_, k) => k !== qi) })
                }
              >
                Delete
              </button>
            </div>
          </div>
          <RichText
            label={`Question ${qi + 1} text`}
            value={q.text}
            onChange={(text) => setQ(qi, { text })}
          />
          <div className="row wrap">
            <label className="check">
              <input
                type="checkbox"
                checked={q.multi}
                onChange={(e) => setQ(qi, { multi: e.target.checked })}
              />{' '}
              Multiple correct answers
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={q.shuffle}
                onChange={(e) => setQ(qi, { shuffle: e.target.checked })}
              />{' '}
              Shuffle options
            </label>
          </div>

          <h4>Options</h4>
          {q.options.map((o, oi) => (
            <div className="option-edit" key={o.id}>
              <label className="check">
                <input
                  type={q.multi ? 'checkbox' : 'radio'}
                  name={`correct-${q.id}`}
                  checked={o.correct}
                  aria-label={`Option ${oi + 1} is correct`}
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
                Correct
              </label>
              <input
                type="text"
                value={o.text}
                aria-label={`Option ${oi + 1} text`}
                onChange={(e) =>
                  setQ(qi, {
                    options: q.options.map((x, k) =>
                      k === oi ? { ...x, text: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                type="text"
                value={o.feedback}
                placeholder="Feedback when chosen (optional)"
                aria-label={`Option ${oi + 1} feedback`}
                onChange={(e) =>
                  setQ(qi, {
                    options: q.options.map((x, k) =>
                      k === oi ? { ...x, feedback: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="danger"
                disabled={q.options.length <= 2}
                aria-label={`Remove option ${oi + 1}`}
                onClick={() => setQ(qi, { options: q.options.filter((_, k) => k !== oi) })}
              >
                ✕
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
            + Add option
          </button>
        </section>
      ))}
      <button
        type="button"
        className="primary"
        onClick={() => onChange({ ...content, questions: [...content.questions, newQuestion()] })}
      >
        + Add question
      </button>
    </div>
  );
}
