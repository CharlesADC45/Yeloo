import { ArrowLeft, Moon, Sun, Globe, User, ChevronRight, Heart, Building2, LogOut, Shield } from "lucide-react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { setLanguage as i18nSetLanguage, getLanguage, useTranslation } from "../utils/i18n";

interface SettingsScreenProps {
  userType: "tenant" | "landlord";
  userId: string;
  accessToken: string;
  onBack: () => void;
  onEditProfile: () => void;
  onMyListings: () => void;
  onSavedApartments: () => void;
  onLogout?: () => void;
  onAdminPanel?: () => void;
}

export function SettingsScreen({ 
  userType, 
  userId, 
  accessToken, 
  onBack, 
  onEditProfile,
  onMyListings,
  onSavedApartments,
  onLogout,
  onAdminPanel
}: SettingsScreenProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<string>(() => {
    try {
      return getLanguage() || (localStorage.getItem("homelink-language") || "english");
    } catch {
      return "english";
    }
  });
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Load user data
    loadUserData();

    // Listen for global language changes so UI updates
    const onLangChange = (e: any) => setLanguage(e.detail || localStorage.getItem("homelink-language") || "english");
    window.addEventListener("homelink-language-changed", onLangChange as EventListener);
    return () => window.removeEventListener("homelink-language-changed", onLangChange as EventListener);
  }, [userId, accessToken]);

  const loadUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      
      if (user) {
        setUserName(user.user_metadata?.name || "User");
        setUserEmail(user.email || "");
        setIsAdmin(user.user_metadata?.isAdmin === true);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const toggleDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("homelink-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("homelink-theme", "light");
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    // persist and broadcast via helper which will dispatch an event
    i18nSetLanguage(newLanguage as any);
    // local state will update via the event listener
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Clear any stored data
      localStorage.removeItem("homelink-theme");
      localStorage.removeItem("homelink-language");
      
      if (onLogout) {
        onLogout();
      } else {
        // Fallback: reload the page to go back to welcome screen
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, reload to clear state
      window.location.reload();
    }
  };

  const { t } = useTranslation();

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
  <h4 className="text-foreground">{t("settings")}</h4>
        <div className="w-10" />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-foreground">{t("settings")}</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Section */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <button
              onClick={onEditProfile}
              className="w-full flex items-center space-x-4 hover:bg-muted/50 p-2 rounded-xl transition-colors"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground shrink-0">
                <span className="text-xl">{userName?.charAt(0).toUpperCase() || "U"}</span>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-foreground">{userName}</h3>
                <p className="text-sm text-muted-foreground capitalize">{userType}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {userType === "landlord" ? (
              <button
                onClick={onMyListings}
                className="flex items-center space-x-3 p-4 border-b border-border w-full hover:bg-muted transition-colors"
              >
                <Building2 className="w-5 h-5 text-primary" />
                <span className="flex-1 text-left text-foreground">My Listings</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ) : (
              <button
                onClick={onSavedApartments}
                className="flex items-center space-x-3 p-4 border-b border-border w-full hover:bg-muted transition-colors"
              >
                <Heart className="w-5 h-5 text-primary" />
                <span className="flex-1 text-left text-foreground">Saved Apartments</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {isAdmin && onAdminPanel && (
              <button
                onClick={onAdminPanel}
                className="flex items-center space-x-3 p-4 w-full hover:bg-muted transition-colors"
              >
                <Shield className="w-5 h-5 text-orange-600" />
                <span className="flex-1 text-left text-foreground">Admin Panel</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Appearance Section */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div>
              <h3 className="text-foreground mb-1">{t("settings")}</h3>
              <p className="text-sm text-muted-foreground">Customize how HomeLink looks</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-foreground" />
                )}
                <div>
                  <Label htmlFor="dark-mode" className="text-foreground">
                    {t("darkMode")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </div>

          {/* Language Section */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div>
              <h3 className="text-foreground mb-1">{t("language")}</h3>
              <p className="text-sm text-muted-foreground">Choose your preferred language</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-foreground" />
                <Label htmlFor="language" className="text-foreground">
                  {t("appLanguage")}
                </Label>
              </div>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language" className="h-12 rounded-xl bg-input-background">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="french">Français (French)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Language preference is saved locally
              </p>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <div>
              <h3 className="text-foreground mb-1">About</h3>
              <p className="text-sm text-muted-foreground">HomeLink Version 1.0.0</p>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 rounded-2xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-5 h-5 mr-2" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
