import { PROFILE } from '../data'
import { useDelayed } from './useDelayed'

export default function ResumeView({ open }) {
  const shown = useDelayed(open, 600)
  const base = import.meta.env.BASE_URL
  return (
    <div className={`view resume-view ${shown ? 'open' : ''}`}>
      <div className="paper">
        <img src={base + PROFILE.resumeImage} alt="Matthew Zhou résumé" />
      </div>
      <div className="paper-actions">
        <a className="btn" href={base + PROFILE.resumePdf} download>download pdf</a>
        <a className="btn ghost" href={base + PROFILE.resumePdf} target="_blank" rel="noreferrer">open in new tab ↗</a>
      </div>
    </div>
  )
}
