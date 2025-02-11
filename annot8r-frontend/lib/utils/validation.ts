// utils/validation.ts

import type { Annotation } from '@/lib/types/annotations';

export function isValidAnnotation(obj: unknown): obj is Annotation {
  if (!obj || typeof obj !== 'object') return false;

  const annotation = obj as Record<string, unknown>;

  return (
    typeof annotation.id === 'string' &&
    typeof annotation.class === 'string' &&
    typeof annotation.x === 'number' &&
    typeof annotation.y === 'number' &&
    typeof annotation.width === 'number' &&
    typeof annotation.height === 'number' &&
    annotation.x >= 0 &&
    annotation.y >= 0 &&
    annotation.width > 0 &&
    annotation.height > 0
  );
}

export function isValidClass(className: string, availableClasses: string[]): boolean {
  return (
    typeof className === 'string' &&
    className.length > 0 &&
    availableClasses.includes(className)
  );
}

export function validateAnnotations(
  annotations: unknown[],
  availableClasses: string[]
): annotations is Annotation[] {
  return annotations.every(
    ann => 
      isValidAnnotation(ann) && 
      (!ann.class || isValidClass(ann.class, availableClasses))
  );
}