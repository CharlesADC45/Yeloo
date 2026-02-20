import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface LocationMapDisplayProps {
  location: string;
  latitude?: number;
  longitude?: number;
}

export function LocationMapDisplay({ location, latitude, longitude }: LocationMapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import Leaflet
    const loadMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        
        // Add Leaflet CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (mapRef.current && !map) {
          let lat = latitude;
          let lng = longitude;

          // If coordinates aren't provided, geocode the location
          if (!lat || !lng) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
              );
              const data = await response.json();
              
              if (data && data.length > 0) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
              } else {
                // Default to San Francisco if geocoding fails
                lat = 37.7749;
                lng = -122.4194;
              }
            } catch (error) {
              console.error("Geocoding error:", error);
              // Default to San Francisco if geocoding fails
              lat = 37.7749;
              lng = -122.4194;
            }
          }

          const newMap = L.map(mapRef.current, {
            center: [lat, lng],
            zoom: 15,
            scrollWheelZoom: false,
            dragging: true,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(newMap);

          // Create custom icon for marker
          const customIcon = L.divIcon({
            className: "custom-marker",
            html: '<div style="background-color: #0891B2; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 4px solid white; box-shadow: 0 4px 12px rgba(8, 145, 178, 0.4);"><div style="transform: rotate(45deg); margin-top: 8px; margin-left: 10px; width: 20px; height: 20px;"></div></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          });

          L.marker([lat, lng], {
            icon: customIcon,
          }).addTo(newMap);

          setMap(newMap);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading map:", error);
        setIsLoading(false);
      }
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [location, latitude, longitude]);

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-foreground">
        <MapPin className="w-5 h-5 text-primary" />
        <span>{location}</span>
      </div>
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl z-10">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-64 rounded-xl overflow-hidden border border-border"
          style={{ zIndex: 0 }}
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Use two fingers to scroll the map
      </p>
    </div>
  );
}
