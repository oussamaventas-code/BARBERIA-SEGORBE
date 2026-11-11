import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <section className="flex min-h-[80svh] flex-col items-center justify-center px-4 text-center">
      <p className="label-mono mb-4">Error 404</p>
      <h1 className="text-5xl font-semibold tracking-tightest text-white">Esta página <span className="editorial font-normal text-champagne">no existe.</span></h1>
      <Link to="/" className="btn btn-gold mt-10">Volver al inicio</Link>
    </section>
  )
}
