// Shared types — consumed by both Customer app and (future) Partner/Staff app.
// Fields marked "Backend FK" are optional today (mock data) but will be required
// once Supabase is wired. Keep them additive to avoid breaking the merge.

export interface Salon {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  address: string;
  distance: string;
  lat: number;
  lng: number;
  startingPrice: number;
  isOpen: boolean;
  tags: string[];
  offer?: string;
  bookingsThisWeek?: number;
  tagline?: string;
  /** Backend FK — owner/partner user id (Partner app). */
  ownerId?: string;
}

export interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  originalPrice?: number;
  category: 'men' | 'women' | 'packages';
  subcategory?: string;
  /** Backend FK — which salon offers this service. */
  salonId?: string;
}

export interface Artist {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  /** Backend FK — which salon this artist works at. */
  salonId?: string;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  service: string;
  date: string;
  artistId?: string;
  helpful: number;
  hasPhoto?: boolean;
  /** Backend FK */
  salonId?: string;
  /** Backend FK */
  userId?: string;
}

export interface Booking {
  id: string;
  salonName: string;
  salonImage: string;
  services: string[];
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  totalPrice: number;
  /** Backend FKs — required once Supabase is wired. */
  userId?: string;
  salonId?: string;
  artistId?: string;
  serviceIds?: string[];
  /** Payment linkage (Cashfree). */
  paymentId?: string;
  paymentStatus?: 'pending' | 'success' | 'failed' | 'refunded';
}

export interface Category {
  id: string;
  name: string;
  image: string;
  gender?: 'male' | 'female' | 'all';
}

// ── Auth user (shared across Customer/Staff/Owner apps) ──
export type UserRole = 'customer' | 'staff' | 'owner';

export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
}
