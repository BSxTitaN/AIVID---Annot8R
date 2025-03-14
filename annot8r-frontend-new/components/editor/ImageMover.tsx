import React from "react";
import {
  Lock,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface ImageMoverProps {
  isLocked: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLockToggle: () => void;
  zoomPercentage: number;
}

export default function ImageMover({
  isLocked,
  onZoomIn,
  onZoomOut,
  onReset,
  onLockToggle,
  zoomPercentage,
}: ImageMoverProps) {
  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 flex flex-col items-center gap-2 p-3 
                   bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-lg">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onZoomOut}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full hover:bg-gray-100"
            >
              <MinusCircle className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom Out</TooltipContent>
        </Tooltip>

        <div className="text-sm font-medium">
          {zoomPercentage}%
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onZoomIn}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full hover:bg-gray-100"
            >
              <PlusCircle className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Zoom In</TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-gray-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onReset}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full hover:bg-gray-100"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Reset View (R)</TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-gray-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onLockToggle}
              variant="ghost"
              size="icon"
              className={`w-10 h-10 rounded-full transition-all ${
                isLocked ? "bg-gray-900 text-white hover:bg-gray-800" : "hover:bg-gray-100"
              }`}
            >
              {isLocked ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Unlock className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isLocked ? "Unlock Canvas (L)" : "Lock Canvas (L)"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}