import React from "react";

interface AnnotationProps {
  annotation: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
  };
  isSelected: boolean;
  isDrawing?: boolean;
  hasClass?: boolean;
  index: number;
  getColor: (id: string) => string;
}

export default function Annotation({
  annotation,
  isSelected,
  isDrawing = false,
  hasClass = false,
  index,
  getColor
}: AnnotationProps) {
  const color = getColor(annotation.id);
  
  // Style box differently if no class is assigned
  const borderStyle = !hasClass && !isDrawing ? 'border-dashed' : 'border-solid';
  const borderColor = isSelected 
    ? '#3B82F6' 
    : isDrawing 
      ? '#3B82F6' 
      : !hasClass 
        ? '#FF4444'  // Red for no class assigned
        : color;

  return (
    <div
      className={`absolute ${isSelected ? "border-[6px]" : "border-4"} ${borderStyle} rounded-md backdrop-filter backdrop-blur-[1px]`}
      style={{
        left: `${annotation.x}px`,
        top: `${annotation.y}px`,
        width: `${annotation.width}px`,
        height: `${annotation.height}px`,
        borderColor: borderColor,
      }}
    >
      {isSelected && (
        <>
          {/* Corner handles */}
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -top-3 -left-3 cursor-nw-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -top-3 -right-3 cursor-ne-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -bottom-3 -left-3 cursor-sw-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -bottom-3 -right-3 cursor-se-resize" />

          {/* Edge handles */}
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg top-1/2 -translate-y-1/2 -left-3 cursor-w-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg top-1/2 -translate-y-1/2 -right-3 cursor-e-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -top-3 left-1/2 -translate-x-1/2 cursor-n-resize" />
          <div className="absolute w-6 h-6 bg-white border-4 border-blue-500 rounded-full shadow-lg -bottom-3 left-1/2 -translate-x-1/2 cursor-s-resize" />
        </>
      )}

      {/* Number indicator */}
      <div 
        className="absolute -top-4 -left-4 flex items-center justify-center w-8 h-8 
                    rounded-full text-base font-semibold border-2 shadow-lg"
        style={{
          backgroundColor: isSelected 
            ? '#3B82F6' 
            : !hasClass && !isDrawing
              ? '#FF4444'  // Red for no class assigned
              : color,
          borderColor: isSelected 
            ? '#3B82F6' 
            : !hasClass && !isDrawing
              ? '#FF4444'
              : color,
          color: 'white'
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}