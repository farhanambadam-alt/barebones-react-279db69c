import { artists as mockArtists } from '@/data/mockData';
import type { Artist } from '@/types/salon';

export const useArtists = (
  salonId?: string,
): { artists: Artist[]; isLoading: boolean; error: string | null } => {
  return {
    artists: mockArtists,
    isLoading: false,
    error: null,
  };
};

export const useArtistById = (id: string | undefined) => {
  const artist = mockArtists.find((a) => a.id === id) ?? null;
  return { artist, isLoading: false, error: artist ? null : 'Artist not found' };
};
