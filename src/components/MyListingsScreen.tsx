import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { ApartmentCard } from "./ApartmentCard";
import { EmptyState } from "./EmptyState";
import { useState, useEffect } from "react";
import { getLandlordApartments, deleteApartment, type Apartment } from "../utils/api";
import { toast } from "sonner";

interface MyListingsScreenProps {
  userId: string;
  accessToken: string;
  onBack: () => void;
  onApartmentClick: (apartmentId: string) => void;
  onAddListing: () => void;
}

export function MyListingsScreen({ userId, accessToken, onBack, onApartmentClick, onAddListing }: MyListingsScreenProps) {
  const [myListings, setMyListings] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getLandlordApartments(userId, accessToken);
      setMyListings(data);
    } catch (error: any) {
      console.error("Failed to load listings:", error);
      toast.error(error.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    try {
      await deleteApartment(id, accessToken);
      toast.success("Listing deleted successfully");
      loadListings();
    } catch (error: any) {
      console.error("Failed to delete listing:", error);
      toast.error(error.message || "Failed to delete listing");
    }
  };
  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">My Listings</h4>
        <div className="w-10" />
      </div>

      <div className="hidden lg:flex items-center justify-between p-6 border-b border-border">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <h2 className="text-foreground">My Listings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : myListings.length > 0 ? (
            myListings.map((listing) => (
              <div key={listing.id} className="relative group">
                <ApartmentCard
                  {...listing}
                  onClick={() => onApartmentClick(listing.id)}
                />
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                    className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon="🏠"
                title="No listings yet"
                description="Start posting your available apartments to connect with tenants"
                actionLabel="Add Your First Listing"
                onAction={onAddListing}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}