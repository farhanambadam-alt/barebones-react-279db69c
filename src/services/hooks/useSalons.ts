import { featuredSalons, nearbySalons } from '@/data/mockData';
import type { Salon } from '@/types/salon';

/**
 * Salon data hooks — sole entry point for salon data across the app.
 * Today returns mock data synchronously. When Supabase lands, swap the
 * body for `useQuery(...)` — no consumer changes required.
 */

export const useSalons = (): {
  featuredSalons: Salon[];
  nearbySalons: Salon[];
  allSalons: Salon[];
  isLoading: boolean;
  error: string | null;
} => {
  return {
    featuredSalons,
    nearbySalons,
    allSalons: [...featuredSalons, ...nearbySalons],
    isLoading: false,
    error: null,
  };
};

export const useSalonById = (id: string | undefined) => {
  const salon = [...featuredSalons, ...nearbySalons].find((s) => s.id === id);
  return {
    salon: salon ?? null,
    isLoading: false,
    error: salon ? null : 'Salon not found',
  };
};
