import { useState, useEffect } from "react";
import { ArrowLeft, Users, Building2, Search, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface AdminScreenProps {
  accessToken: string;
  onBack: () => void;
}

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  userType: "tenant" | "landlord";
  createdAt?: string;
  listingsCount?: number;
  savedCount?: number;
}

export function AdminScreen({ accessToken, onBack }: AdminScreenProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "landlords" | "tenants">("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-372779f7/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "landlords" && user.userType === "landlord") ||
      (activeTab === "tenants" && user.userType === "tenant");

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: users.length,
    landlords: users.filter((u) => u.userType === "landlord").length,
    tenants: users.filter((u) => u.userType === "tenant").length,
    totalListings: users.reduce((sum, u) => sum + (u.listingsCount || 0), 0),
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">Admin Dashboard</h4>
        <div className="w-10" />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Manage and view all users in the system
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border border-border rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl text-foreground">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl text-foreground">{stats.landlords}</div>
                  <div className="text-xs text-muted-foreground">Landlords</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl text-foreground">{stats.tenants}</div>
                  <div className="text-xs text-muted-foreground">Tenants</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-border rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl text-foreground">{stats.totalListings}</div>
                  <div className="text-xs text-muted-foreground">Total Listings</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Tabs */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-input-background border-0"
              />
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="all">All Users ({stats.total})</TabsTrigger>
                <TabsTrigger value="landlords">Landlords ({stats.landlords})</TabsTrigger>
                <TabsTrigger value="tenants">Tenants ({stats.tenants})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <Users className="w-12 h-12 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No users match your search" : "No users found"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredUsers.map((user) => (
                      <Card
                        key={user.userId}
                        className="p-6 border border-border rounded-2xl hover:shadow-lg transition-shadow"
                      >
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                                <span className="text-lg">
                                  {user.name?.charAt(0).toUpperCase() || "U"}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-foreground">{user.name || "Unknown"}</h4>
                                <Badge
                                  variant={user.userType === "landlord" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {user.userType}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2 text-sm">
                            {user.email && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.location && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>{user.location}</span>
                              </div>
                            )}
                            {user.createdAt && (
                              <div className="flex items-center space-x-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  Joined {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="pt-4 border-t border-border flex justify-between text-sm">
                            {user.userType === "landlord" ? (
                              <>
                                <div>
                                  <div className="text-foreground">
                                    {user.listingsCount || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Listings</div>
                                </div>
                                <div>
                                  <div className="text-foreground">Active</div>
                                  <div className="text-xs text-muted-foreground">Status</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <div className="text-foreground">
                                    {user.savedCount || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Saved</div>
                                </div>
                                <div>
                                  <div className="text-foreground">Active</div>
                                  <div className="text-xs text-muted-foreground">Status</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
