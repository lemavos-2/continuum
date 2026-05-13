/*
 * CONTINUUM — Navbar
 * Design: Void Cartography — minimal, dark, transparent-to-solid on scroll
 * Font: DM Sans for nav items. Logo uses Playfair Display.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLogo from "./AppLogo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/92 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <AppLogo />
          <span
            className="text-white font-semibold tracking-tight text-[1.05rem]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Continuum
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[#888888] hover:text-white transition-colors duration-200 text-sm font-medium font-body"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="btn-primary text-sm py-2 px-5"
          >
            Sign in
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-[#888888] hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-white/[0.06] bg-black/97"
          >
            <nav className="container py-4 space-y-4 flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[#888888] hover:text-white transition-colors duration-200 text-sm font-medium py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileOpen(false);
                  }}
                  className="btn-primary text-sm py-2.5 px-4"
                >
                  Sign in
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
