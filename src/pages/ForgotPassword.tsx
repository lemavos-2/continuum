import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import KnowledgeGraph from "@/components/landing/KnowledgeGraph";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
});

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
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
          {/* Left: Knowledge Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -20 }}
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

          {/* Right: Form */}
          <div className="max-w-md">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="mb-12">
              <motion.h1 {...fadeUp(0.15)} className="font-display text-5xl font-bold tracking-tight mb-3 text-[oklch(0.93_0.005_60)]">
                Reset Password
              </motion.h1>
              <motion.p {...fadeUp(0.2)} className="text-[oklch(0.5_0.008_260)] text-base">
                Enter your email to receive a recovery link
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

              {sent ? (
                <motion.div {...fadeUp(0.3)} className="relative text-center space-y-4 py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[oklch(0.72_0.14_195/0.2)] border border-[oklch(0.72_0.14_195/0.4)] flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-[oklch(0.72_0.14_195)]" />
                    </div>
                  </motion.div>
                  <div className="space-y-1">
                    <p className="font-medium text-[oklch(0.93_0.005_60)]">Email sent!</p>
                    <p className="text-sm text-[oklch(0.5_0.008_260)]">Check your inbox to reset your password.</p>
                  </div>
                  <p className="text-xs text-[oklch(0.5_0.008_260)] mt-6 pt-6 border-t border-[oklch(0.72_0.14_195/0.2)]">
                    Didn't receive it? Check your spam folder or try again.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="relative space-y-6">
                  {/* Email */}
                  <motion.div {...fadeUp(0.3)} className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-[oklch(0.7_0.008_260)] uppercase tracking-wider font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.72_0.14_195/0.6)]" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-10 bg-[oklch(0.08_0.01_260/0.6)] border border-[oklch(0.72_0.14_195/0.2)] text-[oklch(0.93_0.005_60)] placeholder:text-[oklch(0.5_0.008_260)] focus:border-[oklch(0.72_0.14_195/0.5)] transition-colors"
                        required
                      />
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    {...fadeUp(0.35)}
                    className="w-full mt-8 relative group"
                  >
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
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      {loading ? "Sending..." : "Send Recovery Link"}
                    </Button>
                  </motion.div>
                </form>
              )}
            </motion.div>

            {/* Footer Link */}
            {!sent && (
              <motion.p {...fadeUp(0.4)} className="text-center mt-8 text-[oklch(0.5_0.008_260)]">
                Remember your password?{" "}
                <Link to="/" className="text-[oklch(0.72_0.14_195)] font-medium hover:text-[oklch(0.72_0.14_195/0.8)] transition-colors">
                  Go back
                </Link>
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
