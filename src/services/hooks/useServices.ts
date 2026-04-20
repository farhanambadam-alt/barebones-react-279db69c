import { services as mockServices } from '@/data/mockData';
import type { Service } from '@/types/salon';

/**
 * Service catalog hook. `salonId` is accepted today but ignored (mock data
 * is global). When Supabase is wired this filters by salon.
 */
export const useServices = (
  salonId?: string,
): { services: Service[]; isLoading: boolean; error: string | null } => {
  return {
    services: mockServices,
    isLoading: false,
    error: null,
  };
};

export const useServiceById = (id: string | undefined) => {
  const service = mockServices.find((s) => s.id === id) ?? null;
  return { service, isLoading: false, error: service ? null : 'Service not found' };
};

/** Lookup helper — sync, mock-only. Used by CartContext to compute totals. */
export const findServiceById = (id: string): Service | undefined =>
  mockServices.find((s) => s.id === id);
