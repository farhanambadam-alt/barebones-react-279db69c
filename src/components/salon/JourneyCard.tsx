import { memo } from 'react';
import { Navigation } from 'lucide-react';
import customerHouseIcon from '@/assets/customer-house.svg';
import salonPointIcon from '@/assets/salon-point.svg';
import { openDirections } from '@/lib/openDirections';

interface JourneyCardProps {
  salonName: string;
  salonAddress: string;
  distance: string;
  lat: number;
  lng: number;
}

/**
 * Visual journey visualization from user location to salon.
 * Extracted from SalonDetail "About" tab for reusability and maintainability.
 */
const JourneyCard = memo(({ salonName, salonAddress, distance, lat, lng }: JourneyCardProps) => (
  <div className="bg-background rounded-2xl border border-border p-4">
    <div className="flex gap-3">
      {/* Vertical route line */}
      <div className="flex flex-col items-center w-10 flex-shrink-0 pt-0.5">
        <img src={customerHouseIcon} alt="Your location" className="w-9 h-9 flex-shrink-0 z-10 object-contain" />
        <div className="w-[2px] flex-1 border-l-2 border-dashed border-primary/30 my-0.5" />
        <img src={salonPointIcon} alt="Salon" className="w-7 h-10 flex-shrink-0 z-10 object-contain" />
      </div>

      {/* Journey details */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="pb-1">
          <p className="text-[14px] font-heading font-semibold text-foreground mt-0.5 leading-snug">
            Your Location
          </p>
        </div>

        {/* Distance + directions badge */}
        {/* Distance + Get Directions CTA */}
        <button
          onClick={() => openDirections({ lat, lng, address: salonAddress })}
          className="my-3 w-full flex items-center justify-between gap-2 bg-primary/10 hover:bg-primary/15 active:scale-[0.98] transition-all px-4 py-2.5 rounded-xl border border-primary/20 shadow-sm cursor-pointer group"
          aria-label="Get directions"
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-heading font-semibold text-primary">
            <Navigation size={14} className="rotate-90" />
            {distance}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-heading font-semibold text-primary group-hover:underline">
            Get Directions
            <Navigation size={13} className="text-primary transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        {/* Destination */}
        <div className="pt-1">
          <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/70">
            Destination
          </p>
          <p className="text-[14px] font-heading font-semibold text-foreground mt-0.5 leading-snug">
            {salonName}
          </p>
          <p className="text-[12px] font-body text-muted-foreground mt-0.5 leading-relaxed">
            {salonAddress}
          </p>
        </div>
      </div>
    </div>
  </div>
));
JourneyCard.displayName = 'JourneyCard';

export default JourneyCard;
