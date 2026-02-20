import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
}

export function FilterModal({ isOpen, onClose, onApply }: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-background w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-foreground">Filters</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <Label>Price Range</Label>
            <div className="pt-2">
              <Slider defaultValue={[500, 3000]} max={5000} step={100} />
              <div className="flex justify-between mt-2 text-muted-foreground">
                <span>$500</span>
                <span>$3,000</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Property Type</Label>
            <RadioGroup defaultValue="all">
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">All Types</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="studio" id="studio" />
                <Label htmlFor="studio" className="flex-1 cursor-pointer">Studio</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="1-bedroom" id="1-bedroom" />
                <Label htmlFor="1-bedroom" className="flex-1 cursor-pointer">1 Bedroom</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="2-bedroom" id="2-bedroom" />
                <Label htmlFor="2-bedroom" className="flex-1 cursor-pointer">2 Bedroom</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Furnishing</Label>
            <RadioGroup defaultValue="all">
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="all" id="furn-all" />
                <Label htmlFor="furn-all" className="flex-1 cursor-pointer">All</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="furnished" id="furnished" />
                <Label htmlFor="furnished" className="flex-1 cursor-pointer">Furnished</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl hover:bg-muted">
                <RadioGroupItem value="unfurnished" id="unfurnished" />
                <Label htmlFor="unfurnished" className="flex-1 cursor-pointer">Unfurnished</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-12 rounded-2xl"
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              if (onApply) onApply();
              onClose();
            }}
            className="flex-1 h-12 rounded-2xl bg-primary"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}