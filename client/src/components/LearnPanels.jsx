import { useState } from 'react';

function DifficultyBadge({ difficulty }) {
  return <span className={`diff diff-${difficulty}`}>{difficulty}</span>;
}

export function LessonsPanel({ lessons, onLoadCode, onExit }) {
  const [activeId, setActiveId] = useState(null);
  const active = lessons.find((l) => l.id === activeId);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Lessons</h2>
        <button className="btn btn-ghost" onClick={onExit}>Close</button>
      </div>
      {!active ? (
        <div className="lesson-grid">
          {lessons.map((l) => (
            <button key={l.id} className="lesson-card" onClick={() => setActiveId(l.id)}>
              <span className="lesson-lang">{l.language.toUpperCase()}</span>
              <span className="lesson-title">{l.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="lesson-view">
          <button className="link-btn" onClick={() => setActiveId(null)}>← All lessons</button>
          <h3>{active.title}</h3>
          {active.body.map((p, i) => (
            <p key={i} className="lesson-par">{p}</p>
          ))}
          <button className="btn btn-run" onClick={() => onLoadCode(active.code)}>
            Load in editor
          </button>
        </div>
      )}
    </div>
  );
}

export function ProblemsPanel({ problems, activeProblem, onSelect, onCheck, checking, onExit }) {
  const p = problems.find((x) => x.id === activeProblem);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Practice Problems</h2>
        <button className="btn btn-ghost" onClick={onExit}>Close</button>
      </div>
      {!p ? (
        <div className="problem-list">
          {problems.map((prob) => (
            <button key={prob.id} className="problem-card" onClick={() => onSelect(prob)}>
              <div className="problem-card-top">
                <span className="problem-title">{prob.title}</span>
                <DifficultyBadge difficulty={prob.difficulty} />
              </div>
              <span className="problem-lang">{prob.language.toUpperCase()}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="problem-view">
          <button className="link-btn" onClick={onSelect(null)}>← All problems</button>
          <div className="problem-card-top">
            <h3>{p.title}</h3>
            <DifficultyBadge difficulty={p.difficulty} />
          </div>
          <p className="lesson-par">{p.prompt}</p>
          <div className="io-grid">
            <div>
              <div className="io-label">Sample Input</div>
              <pre className="io-box">{p.input}</pre>
            </div>
            <div>
              <div className="io-label">Expected Output</div>
              <pre className="io-box">{p.expected}</pre>
            </div>
          </div>
          <button
            className="btn btn-run"
            onClick={onCheck}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Check my solution'}
          </button>
          <button className="btn btn-ghost" onClick={() => onSelect(null)} style={{ marginLeft: 8 }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizPanel({ quiz, onExit }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  if (!quiz) return null;

  const score = quiz.questions.reduce((acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc), 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Quiz: {quiz.title}</h2>
        <button className="btn btn-ghost" onClick={onExit}>Close</button>
      </div>
      <div className="quiz-body">
        {quiz.questions.map((q, i) => (
          <div key={i} className={submitted && answers[i] !== q.answer ? 'quiz-q wrong' : 'quiz-q'}>
            <div className="quiz-head">
              <span className="quiz-num">{i + 1}</span>
              <p className="quiz-text">{q.q}</p>
              {submitted && (answers[i] === q.answer ? (
                <span className="quiz-result ok">Correct</span>
              ) : (
                <span className="quiz-result bad">Wrong</span>
              ))}
            </div>
            <div className="quiz-options">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  className={`quiz-option ${answers[i] === oi ? 'selected' : ''} ${
                    submitted && q.answer === oi ? 'correct' : ''
                  }`}
                  onClick={() => !submitted && setAnswers((a) => ({ ...a, [i]: oi }))}
                  disabled={submitted}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="quiz-footer">
          {submitted ? (
            <p className="quiz-score">You scored {score} / {quiz.questions.length}</p>
          ) : (
            <button
              className="btn btn-run"
              disabled={Object.keys(answers).length !== quiz.questions.length}
              onClick={() => setSubmitted(true)}
            >
              Submit quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
