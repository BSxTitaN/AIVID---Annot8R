// utils/colors.ts
const boldColors = [
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#5856D6', // Purple
    '#FF2D55', // Pink
    '#5AC8FA', // Light Blue
    '#007AFF', // Blue
    '#4CD964', // Lime
    '#FF3B30', // Coral
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#03A9F4', // Light Blue
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#FFC107', // Amber
    '#FF9800', // Orange
    '#FF5722', // Deep Orange
  ];
  
  // Map to store annotation ID to color mapping
  const annotationColors = new Map<string, string>();
  
  export const getAnnotationColor = (id: string): string => {
    if (!annotationColors.has(id)) {
      // Get a random color from the boldColors array
      const randomColor = boldColors[Math.floor(Math.random() * boldColors.length)];
      annotationColors.set(id, randomColor);
    }
    return annotationColors.get(id)!;
  };
  
  export const clearAnnotationColors = () => {
    annotationColors.clear();
  };
  