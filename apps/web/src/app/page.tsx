import { LandingFeatures } from "@/components/landing/features";
import { LandingHero } from "@/components/landing/hero";
import { SuperformulaBackground } from "@/components/landing/superformula-background";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030415] text-white">
      <SuperformulaBackground />
      <div className="relative z-10 flex flex-col">
        <LandingHero />
        <LandingFeatures />
      </div>
    </main>
  );
}
