import { useState } from "react";
import { Flag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

interface StatusProps {
  isDrawing: boolean;
  isLocked: boolean;
  imageFeedback?: string;
  isReviewMode?: boolean;
}

export function StatusInfo({ isDrawing, isLocked, imageFeedback, isReviewMode }: StatusProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 left-4 flex items-center gap-2">
        {isDrawing && (
          <span className="px-3 py-1.5 rounded-full bg-blue-500 text-white border border-blue-200/50 text-sm font-medium shadow-md">
            Drawing Mode
          </span>
        )}

        {isLocked && (
          <span className="px-3 py-1.5 rounded-full bg-red-500 text-white border border-red-200/50 text-sm font-medium shadow-md">
            Locked
          </span>
        )}

        {isReviewMode && imageFeedback && (
          <Button
            onClick={() => setShowFeedbackDialog(true)}
            className="px-3 py-1.5 rounded-full bg-amber-500 text-white border border-amber-200/50 text-sm font-medium shadow-md flex items-center gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span>View Feedback</span>
          </Button>
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              Image Feedback
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-900">
              {imageFeedback}
            </div>
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}