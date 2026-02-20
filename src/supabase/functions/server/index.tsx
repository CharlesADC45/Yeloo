import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());
app.use("*", logger(console.log));

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sign up route
app.post("/make-server-372779f7/signup", async (c) => {
  try {
    const { email, password, name, userType } = await c.req.json();

    // Basic server config validation
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Signup attempted but server is missing SUPABASE_SERVICE_ROLE_KEY");
      return c.json({ error: "Server misconfigured: missing service role key" }, 500);
    }

    // Check if the email already exists in Auth to return a friendly message
    try {
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      if (!listErr && Array.isArray(users)) {
        const existing = users.find((u: any) => (u.email || "").toLowerCase() === (email || "").toLowerCase());
        if (existing) {
          console.log(`Signup failed: email already registered -> ${email}`);
          return c.json({ error: "Email already registered", existing: true, userId: existing.id, userType: existing.user_metadata?.userType || null }, 409);
        }
      }
    } catch (err) {
      // Non-fatal: continue to attempt createUser and rely on its error message if any
      console.warn("Could not list users for pre-check:", err);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, userType },
      email_confirm: true, // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("duplicate")) {
        return c.json({ error: "Email already registered", existing: true }, 409);
      }
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup exception: ${error}`);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Get user profile
app.get("/make-server-372779f7/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

      // Determine role
      let userType = user.user_metadata?.userType;
      if (!userType) {
        const profile = await kv.get(`profile:${user.id}`);
        userType = profile?.userType;
      }

      // Only landlords can create apartments
      if (userType !== 'landlord') {
        return c.json({ error: 'Forbidden: only landlords can create listings' }, 403);
      }

    const profile = await kv.get(`profile:${userId}`);
    
    // Return empty profile if not found instead of error
    if (!profile) {
      return c.json({ 
        profile: {
          userId,
          name: user.user_metadata?.name || "",
          email: user.email || "",
          phone: "",
          whatsapp: "",
          location: "",
          userType: user.user_metadata?.userType || "tenant"
        }
      });
    }

    return c.json({ profile });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Server-side auth validation endpoint
app.post("/make-server-372779f7/auth/validate", async (c) => {
  try {
    const { accessToken, requiredRole } = await c.req.json();

    if (!accessToken) {
      return c.json({ valid: false, error: "Missing token" }, 400);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user?.id) {
      return c.json({ valid: false, error: "Invalid token" }, 401);
    }

    // Determine role from metadata or KV profile
    let userType = user.user_metadata?.userType;
    if (!userType) {
      const profile = await kv.get(`profile:${user.id}`);
      userType = profile?.userType;
    }

    if (requiredRole && userType && requiredRole !== userType) {
      return c.json({ valid: false, error: "role_mismatch", userType }, 403);
    }

    return c.json({ valid: true, userId: user.id, userType });
  } catch (err) {
    console.log("Auth validate error:", err);
    return c.json({ valid: false, error: "server_error" }, 500);
  }
});

// Update user profile
app.put("/make-server-372779f7/profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id || user.id !== userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();
    const currentProfile = await kv.get(`profile:${userId}`) || {};
    const updatedProfile = { ...currentProfile, ...updates, userId };

    await kv.set(`profile:${userId}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log(`Update profile error: ${error}`);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Create apartment listing
app.post("/make-server-372779f7/apartments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const apartment = await c.req.json();
    const apartmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get landlord profile for contact info
    const profile = await kv.get(`profile:${user.id}`);
    
    const apartmentData = {
      ...apartment,
      id: apartmentId,
      landlordId: user.id,
      landlordName: user.user_metadata?.name || "Landlord",
      landlord: user.user_metadata?.name || "Landlord",
      landlordPhone: profile?.phone || "",
      landlordWhatsApp: profile?.whatsapp || profile?.phone || "",
      features: apartment.features || ["Hardwood Floors", "Central AC", "Pet Friendly"],
      createdAt: new Date().toISOString(),
    };

    await kv.set(`apartment:${apartmentId}`, apartmentData);
    
    // Add to landlord's listings
    const landlordListings = await kv.get(`landlord_listings:${user.id}`) || [];
    landlordListings.push(apartmentId);
    await kv.set(`landlord_listings:${user.id}`, landlordListings);

    return c.json({ apartment: apartmentData });
  } catch (error) {
    console.log(`Create apartment error: ${error}`);
    return c.json({ error: "Failed to create apartment listing" }, 500);
  }
});

// Get all apartments
app.get("/make-server-372779f7/apartments", async (c) => {
  try {
    const apartments = await kv.getByPrefix("apartment:");
    return c.json({ apartments });
  } catch (error) {
    console.log(`Get apartments error: ${error}`);
    return c.json({ error: "Failed to fetch apartments" }, 500);
  }
});

// Get single apartment
app.get("/make-server-372779f7/apartments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const apartment = await kv.get(`apartment:${id}`);
    
    if (!apartment) {
      return c.json({ error: "Apartment not found" }, 404);
    }

    return c.json({ apartment });
  } catch (error) {
    console.log(`Get apartment error: ${error}`);
    return c.json({ error: "Failed to fetch apartment" }, 500);
  }
});

// Get landlord's listings
app.get("/make-server-372779f7/landlord/:landlordId/apartments", async (c) => {
  try {
    const landlordId = c.req.param("landlordId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const listingIds = await kv.get(`landlord_listings:${landlordId}`) || [];
    const apartments = [];

    for (const id of listingIds) {
      const apartment = await kv.get(`apartment:${id}`);
      if (apartment) {
        apartments.push(apartment);
      }
    }

    return c.json({ apartments });
  } catch (error) {
    console.log(`Get landlord apartments error: ${error}`);
    return c.json({ error: "Failed to fetch landlord listings" }, 500);
  }
});

// Delete apartment
app.delete("/make-server-372779f7/apartments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Determine role
    let userType = user.user_metadata?.userType;
    if (!userType) {
      const profile = await kv.get(`profile:${user.id}`);
      userType = profile?.userType;
    }

    // Only landlords can delete their apartments
    const apartment = await kv.get(`apartment:${id}`);
    if (!apartment) {
      return c.json({ error: "Apartment not found" }, 404);
    }
    if (apartment.landlordId !== user.id || userType !== 'landlord') {
      return c.json({ error: "Unauthorized or apartment not found" }, 403);
    }

    await kv.del(`apartment:${id}`);

    // Remove from landlord's listings
    const landlordListings = await kv.get(`landlord_listings:${user.id}`) || [];
    const updatedListings = landlordListings.filter((listingId: string) => listingId !== id);
    await kv.set(`landlord_listings:${user.id}`, updatedListings);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete apartment error: ${error}`);
    return c.json({ error: "Failed to delete apartment" }, 500);
  }
});

// Save apartment (tenant favorites)
app.post("/make-server-372779f7/saved-apartments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }
      // Only tenants should be able to save apartments
      let userType = user.user_metadata?.userType;
      if (!userType) {
        const profile = await kv.get(`profile:${user.id}`);
        userType = profile?.userType;
      }
      if (userType !== 'tenant') {
        return c.json({ error: 'Forbidden: only tenants can save apartments' }, 403);
      }

      const { apartmentId } = await c.req.json();
      const savedApartments = await kv.get(`saved_apartments:${user.id}`) || [];
      if (!savedApartments.includes(apartmentId)) {
        savedApartments.push(apartmentId);
        await kv.set(`saved_apartments:${user.id}`, savedApartments);
      }

    return c.json({ savedApartments });
  } catch (error) {
    console.log(`Save apartment error: ${error}`);
    return c.json({ error: "Failed to save apartment" }, 500);
  }
});

// Remove saved apartment
app.delete("/make-server-372779f7/saved-apartments/:id", async (c) => {
  try {
    const apartmentId = c.req.param("id");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const savedApartments = await kv.get(`saved_apartments:${user.id}`) || [];
    const updatedSaved = savedApartments.filter((id: string) => id !== apartmentId);
    await kv.set(`saved_apartments:${user.id}`, updatedSaved);

    return c.json({ savedApartments: updatedSaved });
  } catch (error) {
    console.log(`Remove saved apartment error: ${error}`);
    return c.json({ error: "Failed to remove saved apartment" }, 500);
  }
});

// Get saved apartments
app.get("/make-server-372779f7/saved-apartments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const savedIds = await kv.get(`saved_apartments:${user.id}`) || [];
    const apartments = [];

    for (const id of savedIds) {
      const apartment = await kv.get(`apartment:${id}`);
      if (apartment) {
        apartments.push(apartment);
      }
    }

    return c.json({ apartments });
  } catch (error) {
    console.log(`Get saved apartments error: ${error}`);
    return c.json({ error: "Failed to fetch saved apartments" }, 500);
  }
});

// Check if apartment is saved
app.get("/make-server-372779f7/saved-apartments/check/:apartmentId", async (c) => {
  try {
    const apartmentId = c.req.param("apartmentId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ saved: false });
    }

    const savedIds = await kv.get(`saved_apartments:${user.id}`) || [];
    const saved = savedIds.includes(apartmentId);

    return c.json({ saved });
  } catch (error) {
    console.log(`Check saved apartment error: ${error}`);
    return c.json({ saved: false });
  }
});

// Admin: Get all users with stats
app.get("/make-server-372779f7/admin/users", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify admin access (you can implement role-based access control here)
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all users from Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log(`List users error: ${listError.message}`);
      return c.json({ error: "Failed to list users" }, 500);
    }

    // Get all profiles from KV store
    const profiles = await kv.getByPrefix("profile:");
    const profileMap = new Map();
    profiles.forEach((profile: any) => {
      profileMap.set(profile.userId, profile);
    });

    // Get all listings to count per landlord
    const listings = await kv.getByPrefix("apartment:");
    const listingsCountMap = new Map();
    listings.forEach((listing: any) => {
      const count = listingsCountMap.get(listing.landlordId) || 0;
      listingsCountMap.set(listing.landlordId, count + 1);
    });

    // Get saved apartments count per user
    const savedApartments = await kv.getByPrefix("saved_apartments:");
    const savedCountMap = new Map();
    savedApartments.forEach((saved: any) => {
      const userId = saved.replace("saved_apartments:", "");
      const savedList = kv.get(saved) || [];
      savedCountMap.set(userId, Array.isArray(savedList) ? savedList.length : 0);
    });

    // Combine user data
    const userProfiles = users.map((user) => {
      const profile = profileMap.get(user.id) || {};
      const userType = user.user_metadata?.userType || profile.userType || "tenant";
      
      return {
        userId: user.id,
        name: user.user_metadata?.name || profile.name || "Unknown",
        email: user.email || "",
        phone: profile.phone || "",
        whatsapp: profile.whatsapp || "",
        location: profile.location || "",
        userType,
        createdAt: user.created_at,
        listingsCount: userType === "landlord" ? (listingsCountMap.get(user.id) || 0) : undefined,
        savedCount: userType === "tenant" ? (savedCountMap.get(user.id) || 0) : undefined,
      };
    });

    return c.json({ users: userProfiles });
  } catch (error) {
    console.log(`Admin get users error: ${error}`);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

Deno.serve(app.fetch);
