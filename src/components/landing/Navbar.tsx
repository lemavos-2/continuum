/*
 * CONTINUUM — Navbar
 * Design: Void Cartography — minimal, dark, transparent-to-solid on scroll
 * Font: DM Sans for nav items. Logo uses Playfair Display.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLogo from "./AppLogo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
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
      <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-0">
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

        {/* Botão de redirecionar para o login (substitui o hambúrguer no mobile e mantém no desktop) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="btn-primary text-sm py-2 px-5"
          >
            Sign in
          </button>
        </div>
      </div>
    </motion.header>
  );
}