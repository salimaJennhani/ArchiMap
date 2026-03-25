import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Building2, ShieldCheck, Zap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Branding */}
      <div className="lg:w-1/2 relative flex flex-col justify-between p-8 lg:p-16 bg-sidebar text-sidebar-foreground overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-accent/20 blur-3xl"></div>
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              BuildTrack
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              Architectural <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Project Mastery.
              </span>
            </h1>
            <p className="text-lg text-sidebar-foreground/70 leading-relaxed mb-12">
              Command your field operations, track site visits, and manage blueprints from a single, unified dashboard designed for modern construction teams.
            </p>

            <div className="space-y-6">
              {[
                { icon: Layers, title: "Centralized Projects", desc: "All your sites mapped and tracked." },
                { icon: ShieldCheck, title: "Secure Documents", desc: "Plans and contracts always accessible." },
                { icon: Zap, title: "Real-time Progress", desc: "Log visits and issues instantly." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="bg-sidebar-accent/50 p-2.5 rounded-lg border border-sidebar-border">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sidebar-foreground">{feature.title}</h3>
                    <p className="text-sm text-sidebar-foreground/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/40 mt-12">
          &copy; {new Date().getFullYear()} BuildTrack Inc.
        </div>
      </div>

      {/* Right Panel - Auth */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue managing your projects.
            </p>
          </div>

          <AuthForm />
        </div>
      </div>
    </div>
  );
}

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authentication failed");
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card p-8 rounded-3xl shadow-xl shadow-black/5 border border-border/50 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 rounded-lg h-11"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 rounded-lg h-11"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 text-base font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all"
        >
          {isLoading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => {
          setIsLogin(!isLogin);
          setError("");
        }}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
