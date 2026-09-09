import { Building2, Lightbulb } from 'lucide-react'
import { readStored, type CurrentVisit } from '../data/visitStore'

export default function VisitContext() {
  const visit = readStored<CurrentVisit | null>('current-visit', null)
  return <aside className="visit-context panel">
    <span className="eyebrow">Visita en progreso</span>
    <Building2 className="my-4 text-blue-700" size={26} />
    <h2 className="text-xl font-semibold">{visit?.hospitalName}</h2>
    <p className="mt-2 text-sm text-slate-600">{visit?.area || 'Área no informada'}</p>
    <p className="mt-1 text-sm text-slate-500">{visit?.region}</p>
    <div className="my-6 border-t border-slate-200" />
    <p className="text-sm font-semibold">{visit?.observations?.length || 0} observaciones guardadas</p>
    <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-slate-600"><Lightbulb className="mb-2 text-blue-700" size={20} />Describe varios equipos en una observación. Incluye solo los atributos que conoces; podrás revisarlos antes de guardar.</div>
    <p className="mt-5 text-xs leading-5 text-slate-500">Prototipo: voz, extracción y coincidencias simuladas. Los registros se conservan en este navegador y quedan pendientes de sincronización.</p>
  </aside>
}
