import { useState } from 'react';
import { recordQuiz } from '../lib/progress';
import { useUnsavedWarning } from '../lib/useUnsavedWarning';

export interface Question {
  id: string;
  topic: string;
  difficulty?: 1 | 2 | 3;
  stem: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Props {
  lessonId: string;
  questions: Question[];
}

/**
 * One question at a time, with the explanation shown the moment an answer is given - a
 * misconception is corrected while it is still fresh. 80% or better marks the lesson done.
 */
export function Quiz({ lessonId, questions }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrong, setWrong] = useState<Question[]>([]);

  const question = questions[index];

  useUnsavedWarning(
    !finished && (index > 0 || picked !== null),
    'You have a quiz in progress. Leave now and this attempt is lost.',
  );

  function choose(option: number) {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.answer) setScore((s) => s + 1);
    else setWrong((w) => [...w, question]);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    recordQuiz(lessonId, score, questions.length);
    setFinished(true);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
    setFinished(false);
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <section className="quiz" aria-live="polite">
        <h3>
          {score} / {questions.length} — {percent}%
        </h3>
        <p className="muted">
          {percent >= 80
            ? 'Lesson marked done. The misses below are worth one more read.'
            : 'Marked for review — re-read the linked sections and try again.'}
        </p>
        {wrong.length > 0 && (
          <>
            <h4>Worth revisiting</h4>
            <ul className="review">
              {wrong.map((q) => (
                <li key={q.id}>
                  <strong>{q.topic}</strong> — {q.explanation}
                </li>
              ))}
            </ul>
          </>
        )}
        <button onClick={restart}>Try again</button>
      </section>
    );
  }

  return (
    <section className="quiz">
      <p className="progress-line">
        Question {index + 1} of {questions.length}
        {question.topic && <span className="topic-chip">{question.topic}</span>}
      </p>

      <h3>{question.stem}</h3>

      {question.code && (
        <pre className="quiz-code">
          <code>{question.code}</code>
        </pre>
      )}

      <ul className="options">
        {question.options.map((option, i) => {
          const isAnswer = i === question.answer;
          const state = picked === null ? '' : isAnswer ? 'correct' : i === picked ? 'wrong' : 'muted';
          return (
            <li key={i}>
              <button className={`option ${state}`} onClick={() => choose(i)} disabled={picked !== null}>
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {picked !== null && (
        <div className="explanation" aria-live="polite">
          <p>
            <strong>{picked === question.answer ? 'Correct.' : 'Not quite.'}</strong> {question.explanation}
          </p>
          <button onClick={next}>{index + 1 < questions.length ? 'Next question' : 'See results'}</button>
        </div>
      )}
    </section>
  );
}
