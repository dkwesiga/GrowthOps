import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { bridgeSupabaseSession, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // After a Supabase session exists, exchange it for our app session cookie.
  async function completeLogin() {
    const ok = await bridgeSupabaseSession();
    if (!ok) {
      toast.error("Could not establish a session. Please try again.");
      return;
    }
    await utils.auth.me.invalidate();
    navigate("/");
  }

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Authentication is not configured yet.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is enabled there is no session yet.
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await completeLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!isSupabaseConfigured) {
      toast.error("Authentication is not configured yet.");
      return;
    }
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      toast.success("Magic link sent — check your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!isSupabaseConfigured) {
      toast.error("Authentication is not configured yet.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GrowthOps AI</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Sign in to your account" : "Create an account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailPassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleMagicLink}
              disabled={loading}
            >
              Email me a magic link
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
