import React, { useEffect, useState } from "react";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { getAnnotationColor } from "@/lib/utils/color";

interface AnnotationListProps {
  annotations: Array<{
    id: string;
    class: string;
  }>;
  availableClasses: string[];
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
    <motion.div
      initial={false}
      animate={{
        width: isExpanded ? 320 : 72,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 
                 bg-white/90 backdrop-blur-md border border-gray-200/50 
                 rounded-xl shadow-lg overflow-hidden
                 min-h-[80px] max-h-[24rem] flex flex-col"
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isExpanded ? "collapse" : "expand"}
            initial={{ opacity: 0, rotate: isExpanded ? -90 : 90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: isExpanded ? 90 : -90 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto max-h-[20rem]">
        <ScrollArea className="h-full">
          <div className="py-3">
            {sortedAnnotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className="relative px-4 mb-2 last:mb-0 h-10"
                onClick={() => onAnnotationSelect(annotation.id)}
              >
                {/* Fixed-size number circle */}
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2
             w-8 h-8 rounded-full
             flex items-center justify-center
             text-white text-sm font-medium
             hover:opacity-80 transition-opacity cursor-pointer`}
                  style={{
                    backgroundColor:
                      selectedAnnotationId === annotation.id
                        ? "#3B82F6"
                        : getAnnotationColor(annotation.id),
                    minWidth: "32px",
                    minHeight: "32px",
                    transform: "translate(0, -50%)",
                  }}
                >
                  {index + 1}
                </div>

                {/* Expandable content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="flex items-center gap-3 pl-12 h-10"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
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
                          {availableClasses.map((className) => (
                            <SelectItem key={className} value={className}>
                              {className}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Warning */}
      <AnimatePresence>
        {hasUnassignedClasses && (
          <motion.div
            className="p-3 bg-red-50 border-t border-red-200 shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-sm text-red-600 font-medium whitespace-nowrap">
              {isExpanded ? "Assign classes to continue" : "!"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
