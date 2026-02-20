import { ArrowLeft } from "lucide-react";
import { ApartmentCard } from "./ApartmentCard";
import { EmptyState } from "./EmptyState";
import { useState, useEffect } from "react";
import { getSavedApartments, type Apartment } from "../utils/api";
import { toast } from "sonner";

interface SavedApartmentsScreenProps {
  userId: string;
  accessToken: string;
  onBack: () => void;
  onApartmentClick: (apartmentId: string) => void;
}

export function SavedApartmentsScreen({ userId, accessToken, onBack, onApartmentClick }: SavedApartmentsScreenProps) {
  const [savedApartments, setSavedApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedApartments();
  }, []);

  const loadSavedApartments = async () => {
    try {
      setLoading(true);
      const data = await getSavedApartments(accessToken);
      setSavedApartments(data);
    } catch (error: any) {
      console.error("Failed to load saved apartments:", error);
      toast.error(error.message || "Failed to load saved apartments");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">Saved Apartments</h4>
        <div className="w-10" />
      </div>

      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-foreground">Saved Apartments</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading saved apartments...</p>
            </div>
          ) : savedApartments.length > 0 ? (
            savedApartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                {...apartment}
                onClick={() => onApartmentClick(apartment.id)}
              />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon="💾"
                title="No saved apartments yet"
                description="Start saving your favorite apartments to view them later"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}