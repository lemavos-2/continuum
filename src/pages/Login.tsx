import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import KnowledgeGraph from "@/components/landing/KnowledgeGraph";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
});

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.response?.data?.message || "Check your email and password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setGoogleLoading(false);
      toast({ title: "Error starting Google login", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.09_0.012_260)] text-[oklch(0.93_0.005_60)] flex items-center justify-center overflow-hidden relative">
      {/* Background gradient layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 70% 50%, oklch(0.72 0.14 195 / 0.07) 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 15% 30%, oklch(0.72 0.14 195 / 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 100% 50% at 50% 100%, oklch(0.09 0.012 260) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(1 0 0 / 0.06) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg border border-[oklch(0.72_0.14_195/0.3)] bg-[oklch(0.72_0.14_195/0.06)] hover:bg-[oklch(0.72_0.14_195/0.12)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[oklch(0.72_0.14_195)]" />
        <span className="text-sm text-[oklch(0.72_0.14_195)] font-medium">Back</span>
      </motion.button>

      <div className="container relative z-10 px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-screen">
          {/* Left: Form */}
          <div className="max-w-md">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="mb-12">
              <motion.h1 {...fadeUp(0.15)} className="font-display text-5xl font-bold tracking-tight mb-3 text-[oklch(0.93_0.005_60)]">
                Continuum
              </motion.h1>
              <motion.p {...fadeUp(0.2)} className="text-[oklch(0.5_0.008_260)] text-base">
                Sign in to continue organizing your thoughts
              </motion.p>
            </motion.div>

            {/* Form Card */}
            <motion.div
              {...fadeUp(0.25)}
              className="relative backdrop-blur-xl border border-[oklch(0.72_0.14_195/0.2)] rounded-2xl p-8"
              style={{
                background: "linear-gradient(135deg, oklch(0.12 0.015 260 / 0.8) 0%, oklch(0.14 0.012 260 / 0.8) 100%)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 60% 60% at 50% 50%, oklch(0.72 0.14 195 / 0.1) 0%, transparent 70%)",
                  filter: "blur(30px)",
                }}
              />

              <form onSubmit={handleSubmit} className="relative space-y-5">
                <motion.div {...fadeUp(0.3)} className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-[oklch(0.7_0.005_60)]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.5_0.008_260)]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 bg-[oklch(0.12_0.015_260)] border-[oklch(0.72_0.14_195/0.2)] text-[oklch(0.93_0.005_60)]"
                    />
                  </div>
                </motion.div>

                <motion.div {...fadeUp(0.35)} className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-[oklch(0.7_0.005_60)]">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.5_0.008_260)]" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-[oklch(0.12_0.015_260)] border-[oklch(0.72_0.14_195/0.2)] text-[oklch(0.93_0.005_60)]"
                    />
                  </div>
                </motion.div>

                <motion.div {...fadeUp(0.4)} className="w-full pt-2 relative group">
                  <div
                    className="absolute inset-0 rounded-lg blur-lg group-hover:blur-xl transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.72 0.14 195 / 0.4) 0%, oklch(0.72 0.14 195 / 0.2) 100%)",
                    }}
                  />
                  <Button
                    type="submit"
                    className="w-full relative bg-[oklch(0.72_0.14_195)] text-[oklch(0.09_0.012_260)] hover:bg-[oklch(0.72_0.14_195/0.9)] font-medium tracking-wide transition-all"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div {...fadeUp(0.45)} className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[oklch(0.72_0.14_195/0.2)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[oklch(0.12_0.015_260)] px-3 text-xs text-[oklch(0.5_0.008_260)]">or continue with</span>
                </div>
              </motion.div>

              {/* Google Button */}
              <motion.div
                {...fadeUp(0.5)}
                className="w-full"
              >
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full border border-[oklch(0.72_0.14_195/0.3)] bg-[oklch(0.72_0.14_195/0.05)] hover:bg-[oklch(0.72_0.14_195/0.1)] text-[oklch(0.93_0.005_60)] transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
              </motion.div>
            </motion.div>

            {/* Footer Link */}
            <motion.p {...fadeUp(0.55)} className="text-center mt-8 text-[oklch(0.5_0.008_260)]">
              Don't have an account?{" "}
              <Link to="/register" className="text-[oklch(0.72_0.14_195)] font-medium hover:text-[oklch(0.72_0.14_195/0.8)] transition-colors">
                Create Account
              </Link>
            </motion.p>
          </div>

          {/* Right: Knowledge Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            className="relative h-[420px] lg:h-[540px] hidden lg:block"
          >
            {/* Outer glow ring */}
            <div
              className="absolute inset-4 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 60% at 50% 50%, oklch(0.72 0.14 195 / 0.1) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Canvas */}
            <KnowledgeGraph className="relative z-10" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
