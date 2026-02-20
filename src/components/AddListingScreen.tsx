import { ArrowLeft, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LocationMapPicker } from "./LocationMapPicker";
import { useState, useRef } from "react";
import { createApartment } from "../utils/api";
import { toast } from "sonner";

interface AddListingScreenProps {
  accessToken: string;
  onBack: () => void;
  onSubmit: () => void;
}

export function AddListingScreen({ accessToken, onBack, onSubmit }: AddListingScreenProps) {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [size, setSize] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocationSelect = (address: string, lat: number, lng: number) => {
    setLocation(address);
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (images.length >= 6) {
        toast.error("Maximum 6 images allowed");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !location || !price || !propertyType || !bedrooms || !bathrooms || !size) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setLoading(true);

    try {
      await createApartment(
        {
          title,
          location,
          price: `${price}/mo`,
          type: propertyType,
          bedrooms: parseInt(bedrooms),
          bathrooms: parseInt(bathrooms),
          size: `${size} sq ft`,
          image: images[0],
          images: images, // Save all images
          description,
        },
        accessToken
      );

      toast.success("Listing created successfully!");
      onSubmit();
    } catch (error: any) {
      console.error("Failed to create listing:", error);
      toast.error(error.message || "Failed to create listing");
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
        <h4 className="text-foreground">Add Listing</h4>
        <div className="w-10" />
      </div>

      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-foreground">Add New Listing</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Property Title</Label>
            <Input
              id="title"
              placeholder="e.g. Modern Downtown Loft"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-xl bg-input-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <LocationMapPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={location}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price ($)</Label>
              <Input
                id="price"
                type="number"
                placeholder="1800"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 rounded-xl bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-12 rounded-xl bg-input-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="1-Bedroom">1 Bedroom</SelectItem>
                  <SelectItem value="2-Bedroom">2 Bedroom</SelectItem>
                  <SelectItem value="3-Bedroom">3+ Bedroom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="1"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="h-12 rounded-xl bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                placeholder="1"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="h-12 rounded-xl bg-input-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size (sq ft)</Label>
              <Input
                id="size"
                type="number"
                placeholder="650"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="h-12 rounded-xl bg-input-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your property, including features and amenities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 rounded-xl bg-input-background"
            />
          </div>

          <div className="space-y-3">
            <Label>Property Images</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <img src={image} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={handleImageUpload}
                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted hover:bg-muted/70 flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload up to 6 images. First image will be the cover photo.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-card border-t border-border lg:max-w-4xl lg:mx-auto">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Submitting..." : "Submit Listing"}
        </Button>
      </div>
    </div>
  );
}