/*
 * CONTINUUM — Landing Page
 * Now powered by the ScrollGlobe scroll-driven story.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AuthDialog from "@/components/auth/AuthDialog";
import { ScrollGlobe } from "@/components/ui/landing-page";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const navigate = useNavigate();

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const sections = [
    {
      id: "hero",
      badge: "Continuum",
      title: "Your second",
      subtitle: "brain, mapped.",
      description:
        "Capture every thought, person, and project — and watch them connect into a living graph of knowledge that grows with you.",
      align: "left" as const,
      actions: [
        { label: "Start free", variant: "primary" as const, onClick: () => openAuth("register") },
        { label: "Sign in", variant: "secondary" as const, onClick: () => openAuth("login") },
      ],
    },
    {
      id: "connect",
      badge: "Connections",
      title: "Notes that link themselves.",
      description:
        "Mention people, projects, or topics with @ and # — Continuum stitches everything into your personal knowledge graph automatically.",
      align: "center" as const,
    },
    {
      id: "discover",
      badge: "Discovery",
      title: "See the patterns",
      subtitle: "you couldn't before.",
      description:
        "Explore your ideas spatially. Find unexpected connections, surface forgotten notes, and let your network think with you.",
      align: "left" as const,
      features: [
        { title: "Knowledge Graph", description: "An interactive map of every entity, note, and link in your workspace." },
        { title: "Mentions & Backlinks", description: "Bidirectional relationships keep context one click away." },
        { title: "Time Tracking", description: "Track effort against the projects and activities that matter." },
      ],
    },
    {
      id: "future",
      badge: "Get started",
      title: "Build your",
      subtitle: "continuum.",
      description:
        "Free to start, private by design. Bring your notes, your people, and your work into one connected space.",
      align: "center" as const,
      actions: [
        { label: "Create account", variant: "primary" as const, onClick: () => openAuth("register") },
        { label: "Sign in", variant: "secondary" as const, onClick: () => openAuth("login") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar onAuthOpen={() => openAuth("login")} />
      <main>
        <ScrollGlobe sections={sections} className="bg-black" />
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialTab={authTab} />
    </div>
  );
}
