import { motion, AnimatePresence } from "framer-motion";

interface Status {
  isDrawing: boolean;
  isLocked: boolean;
}

export function StatusInfo({ isDrawing, isLocked }: Status) {
  return (
    <motion.div
      className="fixed bottom-4 left-4 flex items-center gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {isDrawing && (
          <motion.span
            key="drawing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-3 py-1.5 rounded-full bg-blue-500 text-white border border-blue-200/50 text-sm font-medium shadow-md"
          >
            Drawing Mode
          </motion.span>
        )}

        {isLocked && (
          <motion.span
            key="locked"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-3 py-1.5 rounded-full bg-red-500 text-white border border-red-200/50 text-sm font-medium shadow-md"
          >
            Locked
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
