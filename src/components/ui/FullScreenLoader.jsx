export default function FullScreenLoader({ label = 'Cargando' }) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-obsidian" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <span className="editorial text-4xl text-champagne">S</span>
        <span className="h-px w-24 overflow-hidden bg-white/10">
          <span className="block h-full w-1/3 animate-[loader_1.2s_ease-in-out_infinite] bg-champagne" />
        </span>
        <span className="label-mono text-steel">{label}</span>
      </div>
      <style>{`@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  )
}
