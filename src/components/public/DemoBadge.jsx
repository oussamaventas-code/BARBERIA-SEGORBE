export default function DemoBadge({ children = 'Demo' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-champagne/30 bg-champagne/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-champagne">
      <span className="h-1.5 w-1.5 rounded-full bg-champagne" /> {children}
    </span>
  )
}
