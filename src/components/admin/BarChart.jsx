import { money } from '../../lib/format'

/** Gráfico de barras SVG simple. series: [{label, a, b?}] (a = ingresos, b = gastos) */
export default function BarChart({ series, aLabel = 'Ingresos', bLabel = 'Gastos' }) {
  const hasB = series.some((s) => s.b != null)
  const max = Math.max(1, ...series.flatMap((s) => [s.a || 0, s.b || 0]))
  const H = 140
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-3" style={{ height: H + 24 }} role="img" aria-label="Gráfico de barras">
        {series.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col items-center justify-end gap-2" title={`${s.label}: ${money(s.a)}${hasB ? ` · gastos ${money(s.b)}` : ''}`}>
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: H }}>
              <div className="w-full max-w-[26px] rounded-t-lg bg-champagne transition-all duration-700" style={{ height: Math.max(2, ((s.a || 0) / max) * H) }} />
              {hasB && <div className="w-full max-w-[26px] rounded-t-lg bg-status-noshow/80 transition-all duration-700" style={{ height: Math.max(2, ((s.b || 0) / max) * H) }} />}
            </div>
            <span className="font-mono text-[10px] text-steel">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-steel">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-champagne" /> {aLabel}</span>
        {hasB && <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-status-noshow/80" /> {bLabel}</span>}
      </div>
    </div>
  )
}
