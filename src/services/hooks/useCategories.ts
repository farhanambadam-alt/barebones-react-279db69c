import { categories as mockCategories } from '@/data/mockData';
import type { Category } from '@/types/salon';

export const useCategories = (
  gender?: 'male' | 'female' | 'all',
): { categories: Category[]; isLoading: boolean; error: string | null } => {
  const filtered = gender
    ? mockCategories.filter((c) => c.gender === gender)
    : mockCategories;
  return {
    categories: filtered,
    isLoading: false,
    error: null,
  };
};
