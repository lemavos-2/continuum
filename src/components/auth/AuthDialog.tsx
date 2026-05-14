import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type AuthTab = "login" | "register" | "forgot";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
}

export default function AuthDialog({ open, onOpenChange, initialTab = "login" }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:max-w-lg rounded-3xl bg-black/90 border-white/10 shadow-2xl shadow-black/20 p-6 sm:p-8 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <DialogHeader>
                <DialogTitle className="text-3xl">{activeTab === "login" ? "Sign in" : activeTab === "register" ? "Create account" : "Reset password"}</DialogTitle>
                <DialogDescription className="max-w-xl text-white/70">
                  {activeTab === "login"
                    ? "Access your Continuum workspace instantly."
                    : activeTab === "register"
                    ? "Start your free account and begin connecting your ideas."
                    : "Enter your email and we’ll send a recovery link."}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/5 p-1.5">
              {(["login", "register"] as AuthTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={
                    "flex-1 min-w-[110px] whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 " +
                    (activeTab === tab
                      ? "bg-white text-black shadow-[0_14px_32px_rgba(255,255,255,0.18)]"
                      : "text-white/70 hover:text-white hover:bg-white/10")
                  }
                >
                  {tab === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "login" && <LoginForm onSuccess={() => onOpenChange(false)} onForgot={() => setActiveTab("forgot")} />}
          {activeTab === "register" && <RegisterForm onSwitchToLogin={() => setActiveTab("login")} />}
          {activeTab === "forgot" && <ForgotForm onSwitchToLogin={() => setActiveTab("login")} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({ onSuccess, onForgot }: { onSuccess: () => void; onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      onSuccess();
      navigate("/");
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

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      toast({
        title: "Could not start Google login",
        description: "Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/70">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-white/70">Password</label>
          <button
            type="button"
            onClick={onForgot}
            className="text-sm font-semibold text-white/80 hover:text-white hover:underline"
          >
            Forgot?
          </button>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition shadow-[0_14px_34px_rgba(255,255,255,0.16)] hover:bg-white/95 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Signing in…</span> : "Sign in"}
      </button>

      <div className="text-center text-sm text-white/60">or</div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
      >
        Continue with Google
      </button>
    </form>
  );
}

function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await register(username, email, password);
      toast({
        title: "Account created",
        description: "Please sign in to continue.",
      });
      onSwitchToLogin();
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/70">Username</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="johndoe"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating…</span> : "Create account"}
      </button>

      <div className="text-center text-sm text-white/60">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-white hover:underline">
          Sign in
        </button>
      </div>
    </form>
  );
}

function ForgotForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast({
        title: "Unable to send recovery email",
        description: err?.response?.data?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return sent ? (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
      A recovery link has been sent to <span className="font-medium text-white">{email}</span>. Check your inbox and spam folder.
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/30 focus:bg-white/10"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Sending…</span> : "Send recovery link"}
      </button>

      <div className="text-center text-sm text-white/60">
        Remember it?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-white hover:underline">
          Sign in
        </button>
      </div>
    </form>
  );
}
