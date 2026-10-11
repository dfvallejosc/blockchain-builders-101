import { AudienceSection, CertificateTypes, HowItWorks, VerdictsSection } from '@/features/inicio/ContentSections'
import { HeroSection } from '@/features/inicio/HeroSection'
import { LandingFooter } from '@/features/inicio/LandingFooter'
import { LandingNav } from '@/features/inicio/LandingNav'

export const LandingPage = () => (
  <div className="min-h-svh bg-ha-bg text-ha-text">
    <LandingNav />
    <main>
      <HeroSection />
      <HowItWorks />
      <CertificateTypes />
      <VerdictsSection />
      <AudienceSection />
    </main>
    <LandingFooter />
  </div>
)
