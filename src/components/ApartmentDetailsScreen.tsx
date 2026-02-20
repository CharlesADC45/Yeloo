import { ArrowLeft, MapPin, Bed, Bath, Maximize, Heart, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { LocationMapDisplay } from "./LocationMapDisplay";
import { useState, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { getApartment, saveApartment, unsaveApartment, checkIfSaved } from "../utils/api";
import { toast } from "sonner";

interface ApartmentDetailsScreenProps {
  apartmentId: string;
  userId: string;
  accessToken: string;
  onBack: () => void;
}

const apartmentDetails = {
  "1": {
    images: [
      "https://images.unsplash.com/photo-1594873604892-b599f847e859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTk1NjUwNzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1610879485443-c472257793d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzU5NTI1MzE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "https://images.unsplash.com/photo-1579632151052-92f741fb9b79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwYmVkcm9vbSUyMGFwYXJ0bWVudHxlbnwxfHx8fDE3NTk1NzA0MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    ],
    price: "$1,800/mo",
    title: "Modern Downtown Loft",
    location: "Downtown, San Francisco, CA",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    size: "650 sq ft",
    description:
      "Beautiful modern loft in the heart of downtown. Features high ceilings, floor-to-ceiling windows, and stunning city views. Walking distance to public transit, restaurants, and shops. Perfect for young professionals.",
    features: [
      "Hardwood Floors",
      "Central AC",
      "In-unit Washer/Dryer",
      "Pet Friendly",
      "Gym Access",
      "Parking Space",
    ],
    landlord: "Sarah Johnson",
  },
};

export function ApartmentDetailsScreen({
  apartmentId,
  userId,
  accessToken,
  onBack,
}: ApartmentDetailsScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [apartment, setApartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApartment();
    checkSavedStatus();
  }, [apartmentId, userId, accessToken]);

  const loadApartment = async () => {
    try {
      setLoading(true);
      const data = await getApartment(apartmentId, accessToken);
      setApartment(data);
    } catch (error: any) {
      console.error("Failed to load apartment:", error);
  toast.error(t("authFailed") || "Failed to load apartment details");
    } finally {
      setLoading(false);
    }
  };

  const checkSavedStatus = async () => {
    try {
      const saved = await checkIfSaved(userId, apartmentId, accessToken);
      setIsSaved(saved);
    } catch (error) {
      console.error("Failed to check saved status:", error);
    }
  };

  const handleToggleSave = async () => {
    try {
        if (isSaved) {
        await unsaveApartment(userId, apartmentId, accessToken);
        setIsSaved(false);
        toast.success(t("removedFromSaved") || "Removed from saved");
      } else {
        await saveApartment(userId, apartmentId, accessToken);
        setIsSaved(true);
        toast.success(t("saved") || "Saved to favorites");
      }
    } catch (error: any) {
      console.error("Failed to toggle save:", error);
      toast.error(error.message || "Failed to save apartment");
    }
  };

  const handleContactLandlord = () => {
    // Get landlord's WhatsApp from apartment data
    const whatsappNumber = apartment?.landlordWhatsApp || apartment?.landlordPhone || "";
    
    if (!whatsappNumber) {
      toast.error(t("landlordContactUnavailable") || "Landlord contact not available");
      return;
    }

    // Format WhatsApp number (remove non-digits)
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    
    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent(`Hi! I'm interested in ${apartment?.title} at ${apartment?.location}`);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const { t } = useTranslation();

  if (loading || !apartment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const images = apartment.images && apartment.images.length > 0 ? apartment.images : [apartment.image];
  const features = apartment.features || ["Hardwood Floors", "Central AC", "Pet Friendly"];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative">
        <div 
          className="relative h-80 bg-muted overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((image: string, index: number) => (
              <div key={index} className="min-w-full h-full">
                <ImageWithFallback
                  src={image}
                  alt={`${apartment.title} - Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          
          <div className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleSave}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <Heart
                className={`w-5 h-5 ${isSaved ? "fill-red-500 text-red-500" : "text-foreground"}`}
              />
            </button>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {images.map((_: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex ? "bg-white w-8" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge className="bg-accent text-accent-foreground rounded-full px-3 py-1 mb-2">
                  {apartment.type}
                </Badge>
                <h2 className="text-foreground">{apartment.title}</h2>
              </div>
              <p className="text-primary">{apartment.price}</p>
            </div>

            <div className="flex items-center space-x-1 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <p>{apartment.location}</p>
            </div>

            <div className="flex items-center space-x-6 pt-2">
              <div className="flex items-center space-x-2 text-foreground">
                <Bed className="w-5 h-5 text-primary" />
                <span>{apartment.bedrooms} Bed</span>
              </div>
              <div className="flex items-center space-x-2 text-foreground">
                <Bath className="w-5 h-5 text-primary" />
                <span>{apartment.bathrooms} Bath</span>
              </div>
              <div className="flex items-center space-x-2 text-foreground">
                <Maximize className="w-5 h-5 text-primary" />
                <span>{apartment.size}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h3 className="text-foreground">{t("aboutProperty")}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {apartment.description}
            </p>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="text-foreground">{t("locationLabel")}</h3>
            <LocationMapDisplay 
              location={apartment.location}
              latitude={apartment.latitude}
              longitude={apartment.longitude}
            />
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h3 className="text-foreground">{t("features")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-3 bg-secondary rounded-xl"
                >
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <h3 className="text-foreground">{t("landlordLabel")}</h3>
            <div className="flex items-center space-x-3 p-4 bg-secondary rounded-xl">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                {(apartment.landlord || apartment.landlordName)?.charAt(0)}
              </div>
              <div>
                <p className="text-foreground">{apartment.landlord || apartment.landlordName}</p>
                <p className="text-muted-foreground">{t("propertyOwner")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-card border-t border-border">
        <div className="flex space-x-3 max-w-md mx-auto">
          {apartment.landlordPhone && (
              <Button
                onClick={() => window.open(`tel:${apartment.landlordPhone}`, '_self')}
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-2"
              >
                <Phone className="w-5 h-5 mr-2" />
                {t("callLandlord")}
              </Button>
          )}
          <Button
            onClick={handleContactLandlord}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("sendMessage")}
          </Button>
        </div>
      </div>
    </div>
  );
}