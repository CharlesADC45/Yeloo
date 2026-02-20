import { ArrowLeft, Save } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { getProfile, updateProfile } from "../utils/api";
import { toast } from "sonner";

interface EditProfileScreenProps {
  userId: string;
  accessToken: string;
  onBack: () => void;
  onSave: () => void;
}

export function EditProfileScreen({ userId, accessToken, onBack, onSave }: EditProfileScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId, accessToken]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      
      if (user) {
        // Get name and email from auth
        setName(user.user_metadata?.name || "");
        setEmail(user.email || "");

        // Try to get additional profile data from backend
        try {
          const profile = await getProfile(userId, accessToken);
          setPhone(profile.phone || "");
          setWhatsapp(profile.whatsapp || "");
          setLocation(profile.location || "");
        } catch (error) {
          // Profile doesn't exist yet, that's okay
          console.log("No profile found, will create on save");
        }
      }
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);

    try {
      // Update profile in backend
      await updateProfile(
        userId,
        {
          userId,
          name,
          email,
          phone,
          whatsapp,
          location,
          userType: "tenant" as const, // Will be preserved from existing profile
        },
        accessToken
      );

      // Update name in Supabase auth metadata
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { name }
      });

      toast.success("Profile updated successfully!");
      onSave();
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">Edit Profile</h4>
        <div className="w-10" />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h2 className="text-foreground">Edit Profile</h2>
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  disabled
                  className="h-12 rounded-xl bg-input-background opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Call Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 rounded-xl bg-input-background"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-card border-t border-border lg:relative lg:border-t-0">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
