import { useState } from "react";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { createClient } from "../utils/supabase/client";
import { signUp } from "../utils/api";
import { toast } from "sonner";
import { useTranslation } from "../utils/i18n";

interface LoginScreenProps {
  // Define the props for the LoginScreen component
  onBack: () => void;
  onLogin: (userType: "tenant" | "landlord", userId: string, accessToken: string, name?: string) => void;
}

export function LoginScreen({ onBack, onLogin }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<"tenant" | "landlord" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedType || !email || !password) {
      toast.error(t("pleaseFillAll") || "Please fill in all required fields");
      return;
    }

    if (isSignUp && !name) {
      toast.error(t("pleaseEnterName") || "Please enter your name");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        // Sign up new user via server helper
        try {
          await signUp(email, password, name, selectedType);
          toast.success(t("accountCreated") || "Account created successfully!");
        } catch (err: any) {
          // If server says the email exists, show helpful message and switch to login
          if (err?.existing || err?.status === 409) {
            toast.error(t("emailAlreadyRegistered") || "This email is already registered. Try logging in.");
            setIsSignUp(false);
            setLoading(false);
            return;
          }
          throw err;
        }
      }

      // Sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Sign-in error:", error);
        toast.error(error.message || t("authFailed") || "Authentication failed");
        setLoading(false);
        return;
      }

      const accessToken = (data as any)?.session?.access_token;
      const user = (data as any)?.user;

      if (!accessToken || !user?.id) {
        toast.error(t("authFailed") || "Authentication failed");
        setLoading(false);
        return;
      }

      // Check registered role on the account (metadata or profile)
      let registeredType: "tenant" | "landlord" | undefined = (user.user_metadata as any)?.userType;
      if (!registeredType) {
        try {
          const { getProfile } = await import("../utils/api");
          const profile = await getProfile(user.id, accessToken);
          registeredType = profile?.userType;
        } catch (err) {
          console.warn("Could not fetch profile for role check:", err);
        }
      }

      if (registeredType && selectedType && registeredType !== selectedType) {
        // mismatch — sign out and show error
        try { await supabase.auth.signOut(); } catch {}
        toast.error(
          t("roleMismatch")?.replace("{registered}", registeredType).replace("{selected}", selectedType) ||
            `This account is registered as ${registeredType}. Please login as ${registeredType}.`
        );
        setLoading(false);
        return;
      }

      // Server-side verification: ensure user still exists for this access token
      try {
        // call server endpoint for authoritative validation and role enforcement
        try {
          const res = await fetch("/make-server-372779f7/auth/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, requiredRole: selectedType }),
          });

          const body = await res.json();
          if (!res.ok || !body.valid) {
            try { await supabase.auth.signOut(); } catch {}
            const errMsg = body.error === "role_mismatch" ? t("roleMismatch")?.replace("{registered}", body.userType || "") : t("authFailed");
            toast.error(errMsg || "Authentication failed");
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("Auth validate request failed:", err);
          try { await supabase.auth.signOut(); } catch {}
          toast.error(t("authFailed") || "Authentication failed");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("User validation failed:", err);
        try { await supabase.auth.signOut(); } catch {}
        toast.error(t("authFailed") || "Authentication failed");
        setLoading(false);
        return;
      }

      // If signup and phone/whatsapp provided, save it to profile
      if (isSignUp && (phone || whatsapp)) {
        try {
          const { updateProfile } = await import("../utils/api");
          await updateProfile(
            user.id,
            {
              userId: user.id,
              name,
              email,
              phone,
              whatsapp,
              userType: selectedType,
            },
            accessToken
          );
        } catch (err) {
          console.error("Failed to save contact details:", err);
        }
      }

      toast.success(isSignUp ? t("welcomeNew") || "Welcome to HomeLink!" : t("welcomeBack") || "Welcome back!");
      onLogin(selectedType as any, user.id, accessToken, name);
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error?.message || t("authFailed") || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">{isSignUp ? t("signUp") : t("login")}</h4>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 py-8 space-y-6 max-w-md mx-auto w-full">
        <div className="space-y-2 mb-8">
          <h2 className="text-foreground">{isSignUp ? t("welcomeNew") : t("welcomeBack")}</h2>
          <p className="text-muted-foreground">{isSignUp ? t("createAccount") : t("loginToContinue")}</p>
        </div>

        <div className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("namePlaceholder") || "John Doe"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl bg-input-background"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder") || "your@email.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl bg-input-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder") || "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-input-background"
            />
          </div>

          {isSignUp && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("phonePlaceholder") || "+1 (555) 000-0000"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder={t("whatsappPlaceholder") || "+1 (555) 000-0000"}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <Label>{t("continueAs")}</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedType("tenant")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === "tenant"
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-muted-foreground"
              }`}
            >
              <User className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-foreground">{t("tenant")}</p>
            </button>

            <button
              onClick={() => setSelectedType("landlord")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === "landlord"
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-muted-foreground"
              }`}
            >
              <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-foreground">{t("landlord")}</p>
            </button>
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedType || loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 mt-8"
        >
          {loading ? t("pleaseWait") || "Please wait..." : t("continue")}
        </Button>

        <p className="text-center text-muted-foreground">
          {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary"
          >
            {isSignUp ? t("login") : t("signUp")}
          </button>
        </p>
      </div>
    </div>
  );
}