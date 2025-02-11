import React from "react";
import { motion } from "framer-motion";
import { CircleCheckBigIcon, CloudOffIcon, LucideFileQuestion, RefreshCcwIcon } from "lucide-react";

type AutosaveStatus = "saved" | "saving" | "unsaved" | "not_available";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
}

const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({ status }) => {
  const variants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  };

  const getStatusContent = () => {
    switch (status) {
      case "saved":
        return {
          icon: <CircleCheckBigIcon className="w-5 h-5" />,
          color: "bg-green-50 text-green-700 border-green-200",
          text: "All changes saved"
        };
      case "saving":
        return {
          icon: <RefreshCcwIcon className="w-5 h-5 animate-spin" />,
          color: "bg-blue-50 text-blue-700 border-blue-200",
          text: "Saving changes..."
        };
      case "unsaved":
        return {
          icon: <CloudOffIcon className="w-5 h-5" />,
          color: "bg-red-50 text-red-700 border-red-200",
          text: "Unsaved changes"
        };
      default:
        return {
          icon: <LucideFileQuestion className="w-5 h-5" />,
          color: "bg-gray-50 text-gray-700 border-gray-200",
          text: "No changes"
        };
    }
  };

  const { icon, color, text } = getStatusContent();

  return (
    <motion.div
      className="fixed top-4 right-4 z-50"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      <motion.div
        className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-md ${color}`}
        layout
      >
        {icon}
        <span className="text-sm font-medium">{text}</span>
      </motion.div>
    </motion.div>
  );
};

export default AutosaveIndicator;