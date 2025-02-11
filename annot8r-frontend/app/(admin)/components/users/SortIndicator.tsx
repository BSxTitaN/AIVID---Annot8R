import { SortField, SortOrder } from '@/lib/types/users';
import { ArrowUpDown } from 'lucide-react';

interface SortIndicatorProps {
    field: SortField;
    activeField: SortField;
    order: SortOrder;
  }
  
  export function SortIndicator({ field, activeField, order }: SortIndicatorProps) {
    if (field !== activeField) {
      return (
        <ArrowUpDown className="ml-1 h-4 w-4 inline-block text-gray-400" />
      );
    }
  
    return (
      <ArrowUpDown 
        className={`ml-1 h-4 w-4 inline-block text-primary ${
          order === 'desc' ? 'rotate-180' : ''
        } transition-transform duration-200`} 
      />
    );
  }