/*
 * CONTINUUM — Home Page / Landing Page
 * Design: Void Cartography — Bauhaus Digital / Scientific Minimalism
 * Dark mode first. Playfair Display headlines. DM Sans body.
 * Asymmetric layouts. Cyan accent. Framer Motion animations.
 */
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/sections/HeroSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import SolutionSection from "@/components/landing/sections/SolutionSection";
import FeaturesSection from "@/components/landing/sections/FeaturesSection";
import HowItWorksSection from "@/components/landing/sections/HowItWorksSection";
import CTASection from "@/components/landing/sections/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
