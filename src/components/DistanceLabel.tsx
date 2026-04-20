import { memo } from 'react';

interface DistanceLabelProps {
  distance: string;
  className?: string;
}

/**
 * Reusable distance label with 📍 pin emoji.
 * Pure presentational — does not affect any logic.
 */
const DistanceLabel = memo(({ distance, className }: DistanceLabelProps) => (
  <span className={className}>📍 {distance}</span>
));
DistanceLabel.displayName = 'DistanceLabel';

export default DistanceLabel;
