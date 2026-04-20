import { memo } from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';

interface SalonTagProps {
  label: string;
  /** Render the ShieldCheck icon for 'Verified' tags */
  verified?: boolean;
  /** Render as a distance tag with pin icon */
  distance?: boolean;
}

/**
 * Reusable tag badge used across salon cards, detail pages, and listings.
 * Consistent styling: primary tint, rounded, with optional leading icon.
 */
const SalonTag = memo(({ label, verified, distance }: SalonTagProps) => (
  <span className="text-[11px] font-heading font-medium text-primary bg-primary/8 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-primary/12">
    {verified && <ShieldCheck size={11} />}
    {distance && <span>📍</span>}
    {label}
  </span>
));
SalonTag.displayName = 'SalonTag';

export default SalonTag;
