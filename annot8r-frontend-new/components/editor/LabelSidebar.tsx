import React, { useState, useEffect } from "react";
import { Trash2, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectClass } from "@/lib/types";

interface AnnotationListProps {
  annotations: Array<{
    id: string;
    class: string;
  }>;
  availableClasses: ProjectClass[]; // Changed from string[] to ProjectClass[]
  onClassChange: (id: string, newClass: string) => void;
  onDelete: (id: string) => void;
  selectedAnnotationId: string | null;
  onAnnotationSelect: (id: string) => void;
}

export default function AnnotationListPanel({
  annotations,
  availableClasses,
  onClassChange,
  onDelete,
  selectedAnnotationId,
  onAnnotationSelect,
}: AnnotationListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get annotation color from the class definition rather than random generation
  const getAnnotationColor = (id: string): string => {
    const annotation = annotations.find((a) => a.id === id);
    if (annotation?.class) {
      const classObj = availableClasses.find(
        (c) => c.name === annotation.class
      );
      if (classObj && classObj.color) {
        return classObj.color;
      }
    }

    // Fallback to deterministic color based on ID if no class is assigned
    const hash = id.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return `hsl(${hash % 360}, 70%, 50%)`;
  };

  useEffect(() => {
    if (annotations.some((ann) => !ann.class)) {
      setIsExpanded(true);
    }
  }, [annotations]);

  const sortedAnnotations = React.useMemo(() => {
    return [...annotations].sort((a, b) => {
      const getTimestamp = (id: string) => {
        const parts = id.split("-");
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      };
      return getTimestamp(a.id) - getTimestamp(b.id);
    });
  }, [annotations]);

  const hasUnassignedClasses = annotations.some((ann) => !ann.class);

  return (
    <div
      style={{
        width: isExpanded ? 320 : 72,
      }}
      className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50
                 bg-white/90 backdrop-blur-md border border-gray-200/50
                 rounded-xl shadow-lg overflow-hidden
                 min-h-[80px] max-h-[24rem] flex flex-col transition-all duration-300"
    >
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200/50 flex items-center justify-between cursor-pointer shrink-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-sm">
            {annotations.length}
          </span>
        </div>
        <div
          style={{
            transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
            opacity: 1,
            transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-h-[20rem]">
        <ScrollArea className="h-full">
          <div className="py-3">
            {sortedAnnotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className="relative px-4 mb-2 last:mb-0 h-10"
                onClick={() => onAnnotationSelect(annotation.id)}
              >
                {/* Annotation circle with index */}
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2
                             w-8 h-8 rounded-full
                             flex items-center justify-center
                             text-white text-sm font-medium
                             hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    backgroundColor:
                      selectedAnnotationId === annotation.id
                        ? "#3B82F6"
                        : getAnnotationColor(annotation.id),
                    minWidth: "32px",
                    minHeight: "32px",
                  }}
                >
                  {index + 1}
                </div>

                {/* Class selector and delete button */}
                {isExpanded && (
                  <div
                    className="flex items-center gap-3 pl-12 h-10"
                    style={{
                      opacity: isExpanded ? 1 : 0,
                      transform: isExpanded
                        ? "translateX(0)"
                        : "translateX(-20px)",
                      transition:
                        "opacity 0.3s ease-out, transform 0.3s ease-out",
                    }}
                  >
                    <Select
                      value={annotation.class}
                      onValueChange={(value) =>
                        onClassChange(annotation.id, value)
                      }
                    >
                      <SelectTrigger className="h-8 min-w-[120px]">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map((classObj) => (
                          <SelectItem key={classObj.id} value={classObj.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: classObj.color }}
                              />
                              <span>{classObj.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(annotation.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Warning for unassigned classes */}
      {hasUnassignedClasses && (
        <div className="p-3 bg-red-50 border-t border-red-200 shrink-0">
          <p className="text-sm text-red-600 font-medium whitespace-nowrap">
            {isExpanded ? "Assign classes to continue" : "!"}
          </p>
        </div>
      )}
    </div>
  );
}
