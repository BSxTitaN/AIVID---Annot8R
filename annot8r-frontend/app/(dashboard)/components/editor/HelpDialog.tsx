import { motion } from "framer-motion";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function HelpDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 bg-white shadow-lg hover:bg-gray-50 
                     transition-colors duration-200"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </motion.div>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              Keyboard Shortcuts & Controls
            </AlertDialogTitle>
          </AlertDialogHeader>

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

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              className="w-full sm:w-auto"
              onClick={() => setIsOpen(false)}
            >
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}