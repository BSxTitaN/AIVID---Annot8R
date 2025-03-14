import React from "react";
import { Save, Trash2, BoxSelectIcon, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface AnnotationToolbarProps {
  onBoundingBoxCreateMode: () => void;
  onDeleteAll: () => void;
  onSave: () => void;
  onAutoAnnotate?: () => void;
  onRequestChanges?: () => void;
  isDrawing: boolean;
  isAdmin?: boolean;
  isOfficeUser?: boolean;
  isSaving?: boolean;
}

export default function AnnotationToolbar({
  onBoundingBoxCreateMode,
  onDeleteAll,
  onSave,
  onAutoAnnotate,
  onRequestChanges,
  isDrawing,
  isAdmin = false,
  isOfficeUser = false,
  isSaving = false
}: AnnotationToolbarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 p-3
                     bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-lg">
      <TooltipProvider>
        {/* Drawing Mode Button */}
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

        {/* Auto-Annotate Button - Only for Office Users */}
        {isOfficeUser && onAutoAnnotate && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onAutoAnnotate}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full transition-all hover:bg-blue-50 hover:text-blue-500"
                >
                  <Zap className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Auto-Annotate</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200" />
          </>
        )}

        {/* Delete All Button */}
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

        {/* Save Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onSave}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full transition-all hover:bg-green-50 hover:text-green-500"
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (Ctrl+S)</TooltipContent>
        </Tooltip>

        {/* Request Changes Button - Only for Admin in Review Mode */}
        {isAdmin && onRequestChanges && (
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
}