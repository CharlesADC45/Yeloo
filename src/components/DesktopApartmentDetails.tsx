import { useState, useEffect } from "react";
import { useTranslation } from "../utils/i18n";
import { ArrowLeft, Heart, MapPin, Bed, Bath, Maximize, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { LocationMapDisplay } from "./LocationMapDisplay";
import { getApartment, saveApartment, unsaveApartment, checkIfSaved } from "../utils/api";
import { toast } from "sonner";

interface DesktopApartmentDetailsProps {
  apartmentId: string;
  userId: string;
  accessToken: string;
  onBack: () => void;
}

export function DesktopApartmentDetails({ apartmentId, userId, accessToken, onBack }: DesktopApartmentDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
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
    const whatsappNumber = apartment?.landlordWhatsApp || apartment?.landlordPhone || "";
    
    if (!whatsappNumber) {
      toast.error(t("landlordContactUnavailable") || "Landlord contact not available");
      return;
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const message = encodeURIComponent(`Hi! I'm interested in ${apartment?.title} at ${apartment?.location}`);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const { t } = useTranslation();

  if (loading || !apartment) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const images = apartment.images && apartment.images.length > 0 ? apartment.images : [apartment.image];
  const amenities = apartment.features || ["Hardwood Floors", "High Ceilings", "City Views"];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t("backToListings")}</span>
          </button>
          <button
            onClick={handleToggleSave}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${isSaved ? "fill-red-500 text-red-500" : "text-foreground"}`}
            />
            <span>{isSaved ? t("saved") : t("save")}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Images and Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Image */}
              <div className="relative h-96 lg:h-[500px] bg-muted rounded-3xl overflow-hidden">
                <ImageWithFallback
                  src={images[currentImageIndex]}
                  alt={apartment.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative h-24 bg-muted rounded-2xl overflow-hidden transition-all ${
                        index === currentImageIndex ? "ring-4 ring-primary" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <ImageWithFallback
                        src={image}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-foreground">About this property</h3>
                <p className="text-muted-foreground leading-relaxed">{apartment.description}</p>
              </div>

              {/* Location Map */}
              <div className="space-y-4">
                <h3 className="text-foreground">Location</h3>
                <LocationMapDisplay 
                  location={apartment.location}
                  latitude={apartment.latitude}
                  longitude={apartment.longitude}
                />
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <h3 className="text-foreground">Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {amenities.map((amenity: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 px-4 py-3 bg-muted rounded-xl"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-foreground">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Price and Contact */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 space-y-6 sticky top-0">
                <div>
                  <h2 className="text-primary mb-1">{apartment.price}</h2>
                  <h3 className="text-foreground mb-2">{apartment.title}</h3>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{apartment.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-6 border-y border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Bed className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{apartment.bedrooms} Bed</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Bath className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{apartment.bathrooms} Bath</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Maximize className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{apartment.size}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-foreground mb-1">Landlord</h4>
                    <p className="text-muted-foreground">{apartment.landlord || apartment.landlordName}</p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleContactLandlord}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Send Message
                    </Button>
                    {apartment.landlordPhone && (
                      <Button
                        onClick={() => window.open(`tel:${apartment.landlordPhone}`, '_self')}
                        variant="outline"
                        className="w-full h-14 rounded-2xl border-2 border-primary text-primary hover:bg-primary/10"
                      >
                        <Phone className="w-5 h-5 mr-2" />
                          {t("callLandlord")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}