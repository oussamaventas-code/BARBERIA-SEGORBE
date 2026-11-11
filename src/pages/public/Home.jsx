import { useEffect } from 'react'
import Hero from '../../components/public/Hero'
import ServicesSection from '../../components/public/ServicesSection'
import SystemShowcase from '../../components/public/SystemShowcase'
import Manifesto from '../../components/public/Manifesto'
import Process from '../../components/public/Process'
import TrustSection from '../../components/public/TrustSection'
import FinalCTA from '../../components/public/FinalCTA'
import { ScrollTrigger } from '../../lib/gsap'

export default function Home() {
  // Recalcula posiciones cuando termina de cargar el contenido asíncrono
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      <Hero />
      <ServicesSection limit={4} />
      <SystemShowcase />
      <Manifesto />
      <Process />
      <TrustSection />
      <FinalCTA />
    </>
  )
}
