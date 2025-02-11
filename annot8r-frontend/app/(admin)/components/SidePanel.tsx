import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  onRefresh?: () => void;
  actionButtons?: React.ReactNode;
}

export function SidePanel({ 
  open, 
  onClose, 
  title, 
  children, 
  className,
  onRefresh,
  actionButtons
}: SidePanelProps) {
  return (
    <Sheet 
      open={open} 
      onOpenChange={(isOpen) => !isOpen && onClose()}
      modal={true}
    >
      <SheetContent 
        side="right" 
        className={cn("w-[400px] sm:w-[540px]", className)}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <SheetHeader className="flex flex-row items-center justify-between pr-8">
          <SheetTitle>{title}</SheetTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {actionButtons}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-8 overflow-y-auto">
          {children}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
