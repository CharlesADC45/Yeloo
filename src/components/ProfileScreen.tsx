import { ArrowLeft, User, MapPin, Phone, Mail, ChevronRight, Heart, Building2, Settings, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

interface ProfileScreenProps {
  userType: "tenant" | "landlord";
  userId: string;
  accessToken: string;
  onBack: () => void;
  onEditProfile: () => void;
  onMyListings: () => void;
  onSavedApartments: () => void;
  onLogout?: () => void;
}

import { useTranslation } from "../utils/i18n";

export function ProfileScreen({
  userType,
  userId,
  accessToken,
  onBack,
  onEditProfile,
  onMyListings,
  onSavedApartments,
  onLogout,
}: ProfileScreenProps) {
  const { t } = useTranslation();
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userLocation, setUserLocation] = useState("");

  useEffect(() => {
    loadUserData();
  }, [userId, accessToken]);

  const loadUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      
      if (user) {
        setUserName(user.user_metadata?.name || "User");
        setUserEmail(user.email || "");
      }

      // Try to load additional profile data
      try {
        const { getProfile } = await import("../utils/api");
        const profile = await getProfile(userId, accessToken);
        setUserPhone(profile.phone || "");
        setUserLocation(profile.location || "");
      } catch (error) {
        // Profile doesn't exist yet
        console.log("No additional profile data found");
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };
  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">{t("settings")}</h4>
        <div className="w-10" />
      </div>

      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-foreground">Settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col items-center space-y-4 py-6">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
              <User className="w-12 h-12" />
            </div>
              <div className="text-center">
                <h2 className="text-foreground">{userName}</h2>
                <p className="text-muted-foreground capitalize">{userType}</p>
              </div>
            <Button
              onClick={onEditProfile}
              variant="outline"
              className="rounded-full px-6"
            >
              Edit Profile
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground px-2">{t("editProfile")}</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center space-x-3 p-4 border-b border-border">
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-muted-foreground">Email</p>
                  <p className="text-foreground">{userEmail || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 border-b border-border">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-muted-foreground">Phone</p>
                  <p className="text-foreground">{userPhone || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4">
                <MapPin className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-foreground">{userLocation || "Not set"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground px-2">Quick Actions</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
              
              <button className="flex items-center space-x-3 p-4 w-full hover:bg-muted transition-colors">
                <Settings className="w-5 h-5 text-primary" />
                <span className="flex-1 text-left text-foreground">Settings</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <Button
            onClick={() => {
              if (onLogout) onLogout();
            }}
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