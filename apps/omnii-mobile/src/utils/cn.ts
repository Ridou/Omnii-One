import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function for conditional className merging
 * Combines clsx functionality for dynamic className application
 * 
 * @param inputs - Class values to merge
 * @returns Merged className string
 * 
 * @example
 * cn('base-class', condition && 'conditional-class', 'another-class')
 * cn({ 'active': isActive, 'disabled': isDisabled })
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
} 