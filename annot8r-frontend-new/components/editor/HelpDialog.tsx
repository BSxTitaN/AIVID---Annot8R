import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function HelpDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const shortcuts = [
    { action: "Undo", shortcut: isMac ? "⌘ + Z" : "Ctrl + Z" },
    { action: "Redo", shortcut: isMac ? "⌘ + Shift + Z" : "Ctrl + Shift + Z" },
    { action: "Copy Annotation", shortcut: isMac ? "⌘ + C" : "Ctrl + C" },
    { action: "Paste Annotation", shortcut: isMac ? "⌘ + V" : "Ctrl + V" },
    { action: "Delete Annotation", shortcut: "Delete/Backspace" },
    { action: "Cancel Current Action", shortcut: "Escape" },
    { action: "Previous Image", shortcut: "←" },
    { action: "Next Image", shortcut: "→" },
  ];

  const controls = [
    "Click and drag to draw annotations",
    "Scroll to zoom in/out",
    "Hold spacebar and drag to pan",
    "Click annotation to select",
    "Drag corners/edges to resize",
  ];

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 bg-white shadow-lg hover:bg-gray-50 
                     transition-colors duration-200"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Keyboard Shortcuts & Controls
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Keyboard Shortcuts Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
              <div className="space-y-2">
                {shortcuts.map((item) => (
                  <div 
                    key={item.action} 
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-700">{item.action}</span>
                    <code className="px-2 py-1 rounded bg-gray-100 font-mono">
                      {item.shortcut}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Controls</h3>
              <ul className="list-disc list-inside space-y-2">
                {controls.map((control) => (
                  <li 
                    key={control} 
                    className="text-sm text-gray-700"
                  >
                    {control}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}