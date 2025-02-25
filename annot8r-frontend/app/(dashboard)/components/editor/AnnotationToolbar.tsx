import React from "react";
import { Save, Trash2, BoxSelectIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnnotationToolbarProps {
  onBoundingBoxCreateMode: () => void;
  onDeleteAll: () => void;
  onSave: () => void;
  onRequestChanges?: () => void; // Optional prop for admin functionality
  isDrawing: boolean;
  isAdmin?: boolean; // New prop to indicate admin mode
}

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  onBoundingBoxCreateMode,
  onDeleteAll,
  onSave,
  onRequestChanges,
  isDrawing,
  isAdmin = false
}) => (
 <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 p-3 
                  bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-lg">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onBoundingBoxCreateMode}
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded-full transition-all hover:bg-gray-100 ${
              isDrawing ? "bg-gray-900 text-white hover:bg-gray-800" : ""
            }`}
          >
            <BoxSelectIcon className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Draw Bounding Box (B)</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onDeleteAll}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full transition-all hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete All (Ctrl+Shift+D)</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-gray-200" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onSave}
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full transition-all hover:bg-green-50 hover:text-green-500"
          >
            <Save className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save (Ctrl+S)</TooltipContent>
      </Tooltip>

      {isAdmin && (
        <>
          <div className="w-px h-6 bg-gray-200" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRequestChanges}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full transition-all hover:bg-amber-50 hover:text-amber-500"
              >
                <AlertCircle className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Request Changes</TooltipContent>
          </Tooltip>
        </>
      )}
    </TooltipProvider>
  </div>
);

export default AnnotationToolbar;
