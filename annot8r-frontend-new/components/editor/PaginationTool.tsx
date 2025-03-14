import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationControlsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalImage: number;
}

export function NavigationControls({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalImage,
}: NavigationControlsProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 p-3 
                    bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-lg">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onPrevious}
              disabled={!hasPrevious || !onPrevious}
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full ${
                !hasPrevious || !onPrevious ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous Image (←)</TooltipContent>
        </Tooltip>

        <div className="">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {totalImage}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onNext}
              disabled={!hasNext || !onNext}
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full ${
                !hasNext || !onNext ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next Image (→)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}