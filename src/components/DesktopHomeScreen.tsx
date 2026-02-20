import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "./ui/input";
import { ApartmentCard } from "./ApartmentCard";
import { FilterModal } from "./FilterModal";
import { getApartments, type Apartment } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface DesktopHomeScreenProps {
  userId: string;
  accessToken: string;
  onApartmentClick: (apartmentId: string) => void;
}

const mockApartments = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1594873604892-b599f847e859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTk1NjUwNzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$1,800/mo",
    title: "Modern Downtown Loft",
    location: "Downtown, San Francisco",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    size: "650 sq ft",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1610879485443-c472257793d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzU5NTI1MzE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$2,400/mo",
    title: "Luxury 2-Bedroom",
    location: "Marina District, SF",
    type: "2-Bedroom",
    bedrooms: 2,
    bathrooms: 2,
    size: "1,100 sq ft",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1579632151052-92f741fb9b79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwYmVkcm9vbSUyMGFwYXJ0bWVudHxlbnwxfHx8fDE3NTk1NzA0MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$1,500/mo",
    title: "Cozy 1-Bedroom",
    location: "Mission Bay, SF",
    type: "1-Bedroom",
    bedrooms: 1,
    bathrooms: 1,
    size: "750 sq ft",
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NTk0ODAzNjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$2,800/mo",
    title: "Minimalist Penthouse",
    location: "SOMA, San Francisco",
    type: "2-Bedroom",
    bedrooms: 2,
    bathrooms: 2,
    size: "1,300 sq ft",
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1616116408164-54aaffd852b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlnaHQlMjBhcGFydG1lbnQlMjBiYWxjb255fGVufDF8fHx8MTc1OTU3MTkzNHww&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$2,200/mo",
    title: "Bright Balcony Suite",
    location: "Pacific Heights, SF",
    type: "2-Bedroom",
    bedrooms: 2,
    bathrooms: 1,
    size: "950 sq ft",
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1579977735013-00ec242dd6fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGxvZnQlMjB3aW5kb3dzfGVufDF8fHx8MTc1OTU3MTkzNXww&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$3,100/mo",
    title: "Urban Loft with Views",
    location: "Financial District, SF",
    type: "2-Bedroom",
    bedrooms: 2,
    bathrooms: 2,
    size: "1,400 sq ft",
  },
  {
    id: "7",
    image: "https://images.unsplash.com/photo-1603072819161-e864800276cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBraXRjaGVuJTIwbW9kZXJufGVufDF8fHx8MTc1OTU2MDgyM3ww&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$1,950/mo",
    title: "Modern Kitchen Space",
    location: "Noe Valley, SF",
    type: "1-Bedroom",
    bedrooms: 1,
    bathrooms: 1,
    size: "800 sq ft",
  },
  {
    id: "8",
    image: "https://images.unsplash.com/photo-1737737210863-387afd35344e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwYXBhcnRtZW50JTIwaW50ZXJpb3J8ZW58MXx8fHwxNzU5NDk3OTA0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$1,600/mo",
    title: "Cozy Studio Retreat",
    location: "Castro District, SF",
    type: "Studio",
    bedrooms: 0,
    bathrooms: 1,
    size: "550 sq ft",
  },
  {
    id: "9",
    image: "https://images.unsplash.com/photo-1594873604892-b599f847e859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTk1NjUwNzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$2,650/mo",
    title: "Spacious Family Home",
    location: "Sunset District, SF",
    type: "3-Bedroom",
    bedrooms: 3,
    bathrooms: 2,
    size: "1,500 sq ft",
  },
  {
    id: "10",
    image: "https://images.unsplash.com/photo-1610879485443-c472257793d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzU5NTI1MzE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$2,000/mo",
    title: "Contemporary 1-Bed",
    location: "Haight-Ashbury, SF",
    type: "1-Bedroom",
    bedrooms: 1,
    bathrooms: 1,
    size: "850 sq ft",
  },
  {
    id: "11",
    image: "https://images.unsplash.com/photo-1579632151052-92f741fb9b79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwYmVkcm9vbSUyMGFwYXJ0bWVudHxlbnwxfHx8fDE3NTk1NzA0MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$1,750/mo",
    title: "Charming Studio Flat",
    location: "North Beach, SF",
    type: "Studio",
    bedrooms: 0,
    bathrooms: 1,
    size: "600 sq ft",
  },
  {
    id: "12",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NTk0ODAzNjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: "$3,500/mo",
    title: "Luxury Penthouse",
    location: "Russian Hill, SF",
    type: "3-Bedroom",
    bedrooms: 3,
    bathrooms: 3,
    size: "1,800 sq ft",
  },
];

export function DesktopHomeScreen({ userId, accessToken, onApartmentClick }: DesktopHomeScreenProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      setLoading(true);
      const data = await getApartments();
      setApartments(data);
      setFilteredApartments(data);
    } catch (error: any) {
      console.error("Failed to load apartments:", error);
      toast.error(error.message || "Failed to load apartments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredApartments(apartments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = apartments.filter((apt) => {
      return (
        apt.location?.toLowerCase().includes(query) ||
        apt.title?.toLowerCase().includes(query) ||
        apt.type?.toLowerCase().includes(query) ||
        apt.price?.toLowerCase().includes(query)
      );
    });
    setFilteredApartments(filtered);
  }, [searchQuery, apartments]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by location, price, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-input-background border-0"
              />
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Apartments Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading apartments...</p>
            </div>
          ) : filteredApartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <p className="text-muted-foreground">
                {searchQuery ? "No apartments match your search" : "No apartments available"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Check back later for new listings!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filteredApartments.map((apartment, index) => (
                <div
                  key={apartment.id}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                >
                  <ApartmentCard
                    {...apartment}
                    onClick={() => onApartmentClick(apartment.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FilterModal isOpen={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  );
}