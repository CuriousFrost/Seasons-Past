import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoSrc from "@/assets/Seasons-Past-Header.svg";

function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Email already in use",
    "auth/invalid-email": "Invalid email address",
    "auth/weak-password": "Password must be at least 6 characters",
    "auth/user-not-found": "No account with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/invalid-credential": "Invalid email or password",
  };
  return messages[code] || "Authentication failed. Please try again.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, createAccount, sendPasswordReset } =
    useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (tab === "register") {
        await createAccount(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setSuccessMsg("");
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    try {
      await sendPasswordReset(email);
      setSuccessMsg("Password reset email sent!");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(getAuthErrorMessage(code));
    }
  }

  async function handleGoogle() {
    setError("");
    setSuccessMsg("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user") {
        setError(getAuthErrorMessage(code));
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-[820px] overflow-hidden rounded-2xl border shadow-xl md:grid-cols-2">
        {/* Left — branding panel */}
        <div className="hidden md:flex flex-col items-center justify-center bg-card/60 p-10">
          <img
            src={logoSrc}
            alt="Seasons Past"
            className="w-56 brightness-0 dark:brightness-0 dark:invert"
          />
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Track Commander games, decks, and pod stats
            <br />
            in one place.
          </p>
        </div>

        {/* Right — auth form */}
        <div className="flex flex-col gap-6 p-8">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "login" | "register");
              setError("");
              setSuccessMsg("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Create Account
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-muted-foreground text-sm">
            {tab === "register"
              ? "Create an account to log your EDH games and track your results over time."
              : "Sign in to manage your game log, deck performance, and pod history."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase">
                Email
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    tab === "register" ? "new-password" : "current-password"
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {tab === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={handleForgotPassword}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}
            {successMsg && (
              <p className="text-sm text-center text-emerald-500">
                {successMsg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? tab === "register"
                  ? "Creating account..."
                  : "Signing in..."
                : tab === "register"
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
