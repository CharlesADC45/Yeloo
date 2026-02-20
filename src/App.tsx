/**
 * HomeLink - Apartment Search Application
 * 
 * A responsive apartment search app with mobile-first design that adapts to desktop.
 * 
 * Features:
 * - Mobile View (< 1024px): Full mobile experience with bottom navigation
 * - Desktop View (≥ 1024px): Sidebar navigation with multi-column grid layouts
 * - Auth screens (Welcome/Login) are always mobile-first
 * - Smooth scroll functionality with scroll-to-top button
 * - Swipeable image carousels on apartment details
 * - Real-time chat messaging interface
 * - Role-based features (Tenant/Landlord)
 */

import { useState, useEffect } from "react";
import { createClient } from "./utils/supabase/client";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { LoginScreen } from "./components/LoginScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ApartmentDetailsScreen } from "./components/ApartmentDetailsScreen";
import { ChatScreen } from "./components/ChatScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { EditProfileScreen } from "./components/EditProfileScreen";
import { AddListingScreen } from "./components/AddListingScreen";
import { MessagesListScreen } from "./components/MessagesListScreen";
import { SavedApartmentsScreen } from "./components/SavedApartmentsScreen";
import { MyListingsScreen } from "./components/MyListingsScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { AdminScreen } from "./components/AdminScreen";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { DesktopHomeScreen } from "./components/DesktopHomeScreen";
import { DesktopApartmentDetails } from "./components/DesktopApartmentDetails";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type Screen =
  | "welcome"
  | "login"
  | "home"
  | "apartmentDetails"
  | "profile"
  | "editProfile"
  | "addListing"
  | "savedApartments"
  | "myListings"
  | "settings"
  | "admin";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");
  const [userType, setUserType] = useState<"tenant" | "landlord">("tenant");
  const [userId, setUserId] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>("1");
  const [isDesktop, setIsDesktop] = useState(false);
  const [appLanguage, setAppLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem("homelink-language") || "english";
    } catch {
      return "english";
    }
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    // listen for global language changes so the app re-renders
    const onLangChange = (e: any) => setAppLanguage(e.detail || localStorage.getItem("homelink-language") || "english");
    window.addEventListener("homelink-language-changed", onLangChange as EventListener);
    // Validate persisted Supabase session on app start
    (async () => {
      try {
        const supabase = createClient();
        // supabase-js supports getSession()
        const sessionResp = await supabase.auth.getSession();
        const session = (sessionResp as any)?.data?.session;
        if (session?.access_token) {
          // verify user exists server-side
          const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
          if (error || !user?.id) {
            // session invalid or user removed - clear client auth and app state
            try { await supabase.auth.signOut(); } catch {}
            setCurrentScreen("login");
          } else {
            // restore minimal state from session
            setUserId(user.id);
            setUserName(user.user_metadata?.name || "");
            setIsAdmin(user.user_metadata?.isAdmin === true);
            setCurrentScreen("home");
            setUserType((user.user_metadata?.userType as any) || "tenant");
          }
        }
      } catch (err) {
        console.warn("Session validation failed:", err);
      }
    })();
    
    return () => {
      window.removeEventListener("resize", checkScreenSize);
      window.removeEventListener("homelink-language-changed", onLangChange as EventListener);
    };
  }, []);

  const handleLogin = async (type: "tenant" | "landlord", uid: string, token: string, name?: string) => {
    setUserType(type);
    setUserId(uid);
    setAccessToken(token);
    
    // Load user name and check admin status from Supabase auth
    if (name) {
      setUserName(name);
    } else {
      try {
        const { createClient } = await import("./utils/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.user_metadata?.name) {
          setUserName(user.user_metadata.name);
        }
        // Check if user is admin (you can set this in user_metadata during signup)
        if (user?.user_metadata?.isAdmin === true) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Failed to load user name:", error);
      }
    }
    
    setCurrentScreen("home");
  };

  const handleApartmentClick = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setCurrentScreen("apartmentDetails");
  };

  const handleAddListing = () => {
    setCurrentScreen("addListing");
  };

  const handleSubmitListing = () => {
    setCurrentScreen("myListings");
    toast.success("Listing submitted successfully!");
  };

  const handleProfileUpdate = async () => {
    // Reload user name after profile update
    try {
      const { createClient } = await import("./utils/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user?.user_metadata?.name) {
        setUserName(user.user_metadata.name);
      }
    } catch (error) {
      console.error("Failed to reload user name:", error);
    }
    setCurrentScreen("settings");
    toast.success("Profile saved!");
  };

  const handleLogout = () => {
    // After logout, sign out from Supabase to clear persisted session, then go to login
    (async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Failed to sign out from Supabase:", err);
      }
      setCurrentScreen("login");
      setUserType("tenant");
      setUserId("");
      setAccessToken("");
      setUserName("");
    })();
  };

  const handleNavigate = (screen: string) => {
    if (screen === "profile") {
      setCurrentScreen("profile");
    } else if (screen === "home") {
      setCurrentScreen("home");
    } else if (screen === "savedApartments") {
      setCurrentScreen("savedApartments");
    } else if (screen === "myListings") {
      setCurrentScreen("myListings");
    } else if (screen === "settings") {
      setCurrentScreen("settings");
    } else if (screen === "editProfile") {
      setCurrentScreen("editProfile");
    } else if (screen === "admin") {
      setCurrentScreen("admin");
    }
  };

  // Auth screens (welcome/login) should render in full screen, not mobile view
  const isAuthScreen = currentScreen === "welcome" || currentScreen === "login";

  // Welcome screen is always full screen
  if (isAuthScreen) {
    return (
      <div className="size-full bg-background">
        {currentScreen === "welcome" && (
          <div className="animate-in fade-in duration-300">
            <WelcomeScreen onGetStarted={() => setCurrentScreen("login")} />
          </div>
        )}

        {currentScreen === "login" && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <LoginScreen
              onBack={() => setCurrentScreen("welcome")}
              onLogin={handleLogin}
            />
          </div>
        )}

        <Toaster position="top-center" />
      </div>
    );
  }

  // Mobile View
  if (!isDesktop) {
    return (
      <div className="size-full bg-background">
        <div className="max-w-md mx-auto h-full shadow-2xl relative overflow-hidden">
          {currentScreen === "home" && (
            <div className="animate-in fade-in duration-300">
              <HomeScreen
                userType={userType}
                userId={userId}
                accessToken={accessToken}
                onApartmentClick={handleApartmentClick}
                onAddListing={handleAddListing}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {currentScreen === "apartmentDetails" && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
              <ApartmentDetailsScreen
                apartmentId={selectedApartmentId}
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("home")}
              />
            </div>
          )}

          {currentScreen === "profile" && (
            <div className="animate-in fade-in duration-300">
              <ProfileScreen
                userType={userType}
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("home")}
                onEditProfile={() => setCurrentScreen("editProfile")}
                onMyListings={() => setCurrentScreen("myListings")}
                onSavedApartments={() => setCurrentScreen("savedApartments")}
                onLogout={handleLogout}
              />
            </div>
          )}

          {currentScreen === "editProfile" && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
              <EditProfileScreen
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("settings")}
                onSave={handleProfileUpdate}
              />
            </div>
          )}

          {currentScreen === "savedApartments" && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
              <SavedApartmentsScreen
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("profile")}
                onApartmentClick={handleApartmentClick}
              />
            </div>
          )}

          {currentScreen === "myListings" && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
              <MyListingsScreen
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("profile")}
                onApartmentClick={handleApartmentClick}
                onAddListing={handleAddListing}
              />
            </div>
          )}

          {currentScreen === "addListing" && (
            <div className="animate-in fade-in slide-in-from-bottom duration-300">
              <AddListingScreen
                accessToken={accessToken}
                onBack={() => setCurrentScreen("myListings")}
                onSubmit={handleSubmitListing}
              />
            </div>
          )}

          {currentScreen === "settings" && (
            <div className="animate-in fade-in duration-300">
              <SettingsScreen
                userType={userType}
                userId={userId}
                accessToken={accessToken}
                onBack={() => setCurrentScreen("home")}
                onEditProfile={() => setCurrentScreen("editProfile")}
                onMyListings={() => setCurrentScreen("myListings")}
                onSavedApartments={() => setCurrentScreen("savedApartments")}
                onLogout={handleLogout}
                onAdminPanel={isAdmin ? () => setCurrentScreen("admin") : undefined}
              />
            </div>
          )}

          {currentScreen === "admin" && (
            <div className="animate-in fade-in duration-300">
              <AdminScreen
                accessToken={accessToken}
                onBack={() => setCurrentScreen("home")}
              />
            </div>
          )}
        </div>

        <Toaster position="top-center" />
      </div>
    );
  }

  // Desktop View with Sidebar
  return (
    <div className="size-full bg-muted/30 flex">
      <DesktopSidebar
        userType={userType}
        userName={userName}
        isAdmin={isAdmin}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        onAddListing={userType === "landlord" ? handleAddListing : undefined}
      />

      <div className="flex-1 overflow-hidden bg-background">
        {currentScreen === "home" && (
          <div className="h-full animate-in fade-in duration-300">
            <DesktopHomeScreen 
              userId={userId}
              accessToken={accessToken}
              onApartmentClick={handleApartmentClick} 
            />
          </div>
        )}

        {currentScreen === "apartmentDetails" && (
          <div className="h-full animate-in fade-in duration-300">
            <DesktopApartmentDetails
              apartmentId={selectedApartmentId}
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("home")}
            />
          </div>
        )}

        {currentScreen === "profile" && (
          <div className="h-full animate-in fade-in duration-300">
            <ProfileScreen
              userType={userType}
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("home")}
              onEditProfile={() => setCurrentScreen("editProfile")}
              onMyListings={() => setCurrentScreen("myListings")}
              onSavedApartments={() => setCurrentScreen("savedApartments")}
              onLogout={handleLogout}
            />
          </div>
        )}

        {currentScreen === "editProfile" && (
          <div className="h-full animate-in fade-in duration-300">
            <EditProfileScreen
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("settings")}
              onSave={() => {
                setCurrentScreen("settings");
                toast.success("Profile saved!");
              }}
            />
          </div>
        )}

        {currentScreen === "savedApartments" && (
          <div className="h-full animate-in fade-in duration-300">
            <SavedApartmentsScreen
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("profile")}
              onApartmentClick={handleApartmentClick}
            />
          </div>
        )}

        {currentScreen === "myListings" && (
          <div className="h-full animate-in fade-in duration-300">
            <MyListingsScreen
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("profile")}
              onApartmentClick={handleApartmentClick}
              onAddListing={handleAddListing}
            />
          </div>
        )}

        {currentScreen === "addListing" && (
          <div className="h-full animate-in fade-in duration-300">
            <AddListingScreen
              accessToken={accessToken}
              onBack={() => setCurrentScreen("myListings")}
              onSubmit={handleSubmitListing}
            />
          </div>
        )}

        {currentScreen === "settings" && (
          <div className="h-full animate-in fade-in duration-300">
            <SettingsScreen
              userType={userType}
              userId={userId}
              accessToken={accessToken}
              onBack={() => setCurrentScreen("home")}
              onEditProfile={() => setCurrentScreen("editProfile")}
              onMyListings={() => setCurrentScreen("myListings")}
              onSavedApartments={() => setCurrentScreen("savedApartments")}
              onLogout={handleLogout}
              onAdminPanel={isAdmin ? () => setCurrentScreen("admin") : undefined}
            />
          </div>
        )}

        {currentScreen === "admin" && (
          <div className="h-full animate-in fade-in duration-300">
            <AdminScreen
              accessToken={accessToken}
              onBack={() => setCurrentScreen("home")}
            />
          </div>
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}