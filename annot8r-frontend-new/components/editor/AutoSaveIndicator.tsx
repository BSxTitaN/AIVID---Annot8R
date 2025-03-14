import React from "react";
import {
  CircleCheckBigIcon,
  CloudOffIcon,
  FileQuestion,
  RefreshCcwIcon,
  AlertCircle
} from "lucide-react";

// Update the type to match the expanded options in Editor component
export type AutosaveStatus = "saved" | "saving" | "unsaved" | "not_available" | "error";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
}

export default function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
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
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: "bg-red-50 text-red-700 border-red-200",
          text: "Save failed"
        };
      default:
        return {
          icon: <FileQuestion className="w-5 h-5" />,
          color: "bg-gray-50 text-gray-700 border-gray-200",
          text: "No changes"
        };
    }
  };

  const { icon, color, text } = getStatusContent();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-md ${color}`}>
        {icon}
        <span className="text-sm font-medium">{text}</span>
      </div>
    </div>
  );
}