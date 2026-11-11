import { useEffect } from 'react'
import Hero from '../../components/public/Hero'
import ServicesSection from '../../components/public/ServicesSection'
import Manifesto from '../../components/public/Manifesto'
import VisitSection from '../../components/public/VisitSection'
import FinalCTA from '../../components/public/FinalCTA'
import { ScrollTrigger } from '../../lib/gsap'

export default function Home() {
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      <Hero />
      <ServicesSection limit={4} />
      <Manifesto />
      <VisitSection />
      <FinalCTA />
    </>
  )
}
