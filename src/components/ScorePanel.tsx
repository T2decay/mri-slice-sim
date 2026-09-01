import type { ExamScore } from '../lib/scoring'

interface Props {
  score: ExamScore
}

const METRIC_LABEL = { center: 'center', angle: 'angle', size: 'size' } as const

/** Per-view metric chips + coverage-language feedback, plus the composite. */
export default function ScorePanel({ score }: Props) {
  return (
    <section className="score-panel">
      <div className="composite">
        <span className="composite-number">{score.composite}%</span>
        <span className="composite-label">
          composite — green shows the reference placement
        </span>
      </div>
      <div className="score-views">
        {score.views.map((v) => (
          <div key={v.plane} className="score-view">
            <h4>
              {v.plane} <span className="view-pct">{Math.round(v.score * 100)}%</span>
            </h4>
            <div className="chips">
              {v.metrics.map((m) => (
                <span key={m.metric} className={`chip ${m.grade}`}>
                  {METRIC_LABEL[m.metric]} {m.amount}
                </span>
              ))}
            </div>
            <ul className="feedback">
              {v.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
