import { Home, User, Plus, Heart, List, Settings, Shield } from "lucide-react";
import { useTranslation } from "../utils/i18n";

interface DesktopSidebarProps {
  userType: "tenant" | "landlord";
  currentScreen: string;
  userName?: string;
  isAdmin?: boolean;
  onNavigate: (screen: string) => void;
  onAddListing?: () => void;
}

export function DesktopSidebar({ userType, currentScreen, userName, isAdmin, onNavigate, onAddListing }: DesktopSidebarProps) {
  const { t } = useTranslation();

  const navigationItems = [
    { id: "home", icon: Home, label: t("home") },
    { id: "settings", icon: Settings, label: t("settings") },
  ];

  const tenantItems = [
    { id: "savedApartments", icon: Heart, label: t("saved") },
  ];

  const landlordItems = [
    { id: "myListings", icon: List, label: t("myListings") },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col shadow-sm desktop-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Home className="w-6 h-6 text-primary-foreground" />
          </div>
          <h3 className="text-primary">HomeLink</h3>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4 border-t border-border mt-4">
          {userType === "tenant"
            ? tenantItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })
            : landlordItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
        </div>

            {userType === "landlord" && onAddListing && (
          <button
            onClick={onAddListing}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
          >
            <Plus className="w-5 h-5" />
            <span>{t("addListing")}</span>
          </button>
        )}

        {isAdmin && (
          <div className="pt-4 border-t border-border mt-4">
            <button
              onClick={() => onNavigate("admin")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                currentScreen === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Admin Panel</span>
            </button>
          </div>
        )}
      </nav>

  {/* User Info - push to bottom */}
  <div className="p-4 border-t border-border mt-auto">
        <button 
          onClick={() => onNavigate("editProfile")}
          className="flex items-center space-x-3 px-2 w-full hover:bg-muted rounded-xl py-2 transition-colors"
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <span>{userName?.charAt(0).toUpperCase() || "U"}</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-foreground">{userName || "User Name"}</p>
            <p className="text-muted-foreground text-xs capitalize">{userType}</p>
          </div>
        </button>
      </div>
    </div>
  );
}