export default function BookingSteps({ step, labels }) {
  return (
    <ol className="mb-10 flex items-center gap-2" aria-label="Progreso de la reserva">
      {labels.map((l, i) => {
        const n = i + 1
        const done = n < step
        const cur = n === step
        return (
          <li key={l} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={cur ? 'step' : undefined}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors ${cur ? 'border-champagne bg-champagne text-obsidian' : done ? 'border-champagne/60 text-champagne' : 'border-white/15 text-steel'}`}>{n}</span>
            <span className={`hidden text-xs sm:block ${cur ? 'text-white' : 'text-steel'}`}>{l}</span>
            {i < labels.length - 1 && <span className={`h-px flex-1 ${done ? 'bg-champagne/50' : 'bg-white/10'}`} />}
          </li>
        )
      })}
    </ol>
  )
}
