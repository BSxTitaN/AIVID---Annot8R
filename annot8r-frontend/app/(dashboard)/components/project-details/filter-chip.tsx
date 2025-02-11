import { memo } from "react";

const FilterChip = memo(function FilterChip({ 
  label, 
  count, 
  active, 
  onClick 
}: { 
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-2xl flex items-center gap-2
        transition-all duration-200
        ${active 
          ? "bg-gray-800 text-white" 
          : "bg-[#F4F4F4] text-gray-500 hover:bg-gray-200"
        }
      `}
    >
      <span className="font-medium">{label}</span>
      <span className={`
        px-2 py-0.5 rounded-full text-xs
        ${active 
          ? "bg-white/20 text-white" 
          : "bg-gray-200 text-gray-600"
        }
      `}>
        {count}
      </span>
    </button>
  );
});

export function ProjectDetailFilters({
  total,
  annotatedCount,
  unannotatedCount,
  activeFilter,
  onFilterChange,
}: {
  total: number;
  annotatedCount: number;
  unannotatedCount: number;
  activeFilter: "all" | "annotated" | "unannotated";
  onFilterChange: (filter: "all" | "annotated" | "unannotated") => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <FilterChip
        label="All Images"
        count={total}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <FilterChip
        label="Annotated"
        count={annotatedCount}
        active={activeFilter === "annotated"}
        onClick={() => onFilterChange("annotated")}
      />
      <FilterChip
        label="Unannotated"
        count={unannotatedCount}
        active={activeFilter === "unannotated"}
        onClick={() => onFilterChange("unannotated")}
      />
    </div>
  );
}