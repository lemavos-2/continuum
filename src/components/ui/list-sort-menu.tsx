import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal } from "@/lib/heroicons";

export type ListSortMode = "recent" | "oldest" | "az" | "za";

function isListSortMode(value: string): value is ListSortMode {
  return value === "recent" || value === "oldest" || value === "az" || value === "za";
}

interface ListSortMenuProps {
  value: ListSortMode;
  onValueChange: (value: ListSortMode) => void;
  labels: {
    button: string;
    recent: string;
    oldest: string;
    az: string;
    za: string;
  };
}

export function ListSortMenu({ value, onValueChange, labels }: ListSortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl bg-accent lg:h-8 lg:w-8 lg:rounded-md"
          aria-label={labels.button}
          title={labels.button}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isListSortMode(next)) onValueChange(next);
          }}
        >
          <DropdownMenuRadioItem value="recent">{labels.recent}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="oldest">{labels.oldest}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="az">{labels.az}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="za">{labels.za}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
