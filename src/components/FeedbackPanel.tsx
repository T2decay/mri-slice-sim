import type { Plane } from '../types'

export interface ViewFeedback {
  plane: Plane
  feedback: string[]
}

interface Props {
  views: ViewFeedback[]
}

/** After Scan: the green reference is showing; feedback quotes the coverage text. */
export default function FeedbackPanel({ views }: Props) {
  return (
    <section className="feedback-panel">
      <p className="feedback-lead">Green shows the available reference placements.</p>
      <div className="feedback-views">
        {views.map((v) => (
          <div key={v.plane} className="feedback-view">
            <h4>{v.plane}</h4>
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
