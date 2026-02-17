import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface EditableBadgesProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  variant?: "secondary" | "outline";
}

export const EditableBadges = ({ label, items, onChange, variant = "secondary" }: EditableBadgesProps) => {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setValue("");
    setAdding(false);
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5 mt-1 flex-wrap items-center">
        {items.map((item) => (
          <Badge key={item} variant={variant} className="text-xs gap-1 pr-1">
            {item}
            <button onClick={() => onChange(items.filter((i) => i !== item))} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {adding ? (
          <div className="flex gap-1 items-center">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-7 w-32 text-xs"
              autoFocus
              placeholder={`Add ${label.toLowerCase()}...`}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => { setAdding(false); setValue(""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3 mr-0.5" /> Add
          </Button>
        )}
      </div>
    </div>
  );
};
