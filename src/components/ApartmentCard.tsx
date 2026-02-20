import { MapPin, Bed, Bath, Maximize } from "lucide-react";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ApartmentCardProps {
  id: string;
  image: string;
  price: string;
  title: string;
  location: string;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: string;
  onClick: () => void;
}

export function ApartmentCard({
  image,
  price,
  title,
  location,
  type,
  bedrooms,
  bathrooms,
  size,
  onClick,
}: ApartmentCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="relative h-48 bg-muted">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-accent text-accent-foreground rounded-full px-3 py-1">
            {type}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-foreground">{title}</h3>
          <p className="text-primary">{price}</p>
        </div>

        <div className="flex items-center space-x-1 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <p className="text-muted-foreground">{location}</p>
        </div>

        <div className="flex items-center space-x-4 text-muted-foreground pt-2">
          {bedrooms && (
            <div className="flex items-center space-x-1">
              <Bed className="w-4 h-4" />
              <span>{bedrooms}</span>
            </div>
          )}
          {bathrooms && (
            <div className="flex items-center space-x-1">
              <Bath className="w-4 h-4" />
              <span>{bathrooms}</span>
            </div>
          )}
          {size && (
            <div className="flex items-center space-x-1">
              <Maximize className="w-4 h-4" />
              <span>{size}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}