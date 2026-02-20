import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface LocationMapPickerProps {
  onLocationSelect: (location: string, lat: number, lng: number) => void;
  initialLocation?: string;
}

export function LocationMapPicker({ onLocationSelect, initialLocation }: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState(initialLocation || "");

  useEffect(() => {
    // Dynamically import Leaflet
    const loadMap = async () => {
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
        // Default to San Francisco coordinates
        const defaultLat = 37.7749;
        const defaultLng = -122.4194;

        const newMap = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(newMap);

        // Create custom icon for marker
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: '<div style="background-color: #0891B2; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); margin-top: 6px; margin-left: 8px; width: 16px; height: 16px;"></div></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const newMarker = L.marker([defaultLat, defaultLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(newMap);

        // Handle marker drag
        newMarker.on("dragend", async (e: any) => {
          const position = e.target.getLatLng();
          await reverseGeocode(position.lat, position.lng);
        });

        // Handle map click
        newMap.on("click", async (e: any) => {
          const { lat, lng } = e.latlng;
          newMarker.setLatLng([lat, lng]);
          await reverseGeocode(lat, lng);
        });

        setMap(newMap);
        setMarker(newMarker);
      }
    };

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSelectedAddress(address);
      onLocationSelect(address, lat, lng);
    } catch (error) {
      console.error("Geocoding error:", error);
      const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSelectedAddress(address);
      onLocationSelect(address, lat, lng);
    }
  };

  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery || !map || !marker) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        
        map.setView([latNum, lngNum], 15);
        marker.setLatLng([latNum, lngNum]);
        setSelectedAddress(display_name);
        onLocationSelect(display_name, latNum, lngNum);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search location or click on map"
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchLocation(selectedAddress);
            }
          }}
          className="w-full h-12 pl-10 pr-4 rounded-xl bg-input-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-xl overflow-hidden border border-border"
        style={{ zIndex: 0 }}
      />
      
      <p className="text-xs text-muted-foreground">
        Click on the map or drag the marker to select a location, or search above
      </p>
    </div>
  );
}
