import { reviews as mockReviews } from '@/data/mockData';
import type { Review } from '@/types/salon';

export const useReviews = (
  salonId?: string,
): { reviews: Review[]; isLoading: boolean; error: string | null } => {
  return {
    reviews: mockReviews,
    isLoading: false,
    error: null,
  };
};
