import { useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MobileFilterDropdownProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const MobileFilterDropdown = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: MobileFilterDropdownProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (category: string) => {
    onSelectCategory(category);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-background border-border"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="font-medium">{selectedCategory}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-2 bg-background border-border z-50"
        align="start"
      >
        <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "ghost"}
              size="sm"
              className={`justify-start text-xs h-8 ${
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              }`}
              onClick={() => handleSelect(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MobileFilterDropdown;
