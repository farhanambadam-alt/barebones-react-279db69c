
Adding phase-based photo upload + review section to customer Bookings cards. Pure UI, useState only.

## Scope
File: `src/pages/Bookings.tsx`

## Behavior

**Per booking card** — add expandable "Photos & Review" toggle below existing card content.

**Phase logic** (driven by existing `booking.status`):
- `upcoming` / `confirmed` → Phase 1 (Booked)
- `completed` → Phase 2 (Completed)
- `cancelled` → section hidden

**Phase 1 (Booked):**
- "Before" upload button: active, file input, stores preview in local state
- "After" upload: locked card with lock icon + "Available after service"
- Review form: locked card with lock icon + "Available after service"

**Phase 2 (Completed):**
- "Before" upload: active (or shows already-uploaded preview)
- "After" upload: active
- Review form: 5-star rating selector + textarea + Submit button
- After submit → show submitted review read-only with "Thanks for your feedback" state

## State shape (local to Bookings page)

```ts
type BookingMedia = {
  beforeUrl?: string;
  afterUrl?: string;
  rating?: number;
  reviewText?: string;
  submitted?: boolean;
};
const [media, setMedia] = useState<Record<string, BookingMedia>>({});
const [expanded, setExpanded] = useState<Record<string, boolean>>({});
```

File uploads use `URL.createObjectURL` for preview only (no backend).

## Visual style
- Match existing card aesthetic (rounded-2xl, border, card bg)
- Before/After images: side-by-side grid, gradient overlay + corner label ("BEFORE" / "AFTER") — same treatment as StaffProfile reviews section
- Locked state: muted bg, Lock icon (lucide), small caption
- Star rating: 5 lucide `Star` icons, fill on select
- Submit toast via existing `sonner`

## Files changed

| File | Action |
|---|---|
| `src/pages/Bookings.tsx` | Add expandable section + phase-gated upload/review UI |

No new components, no new contexts, no routing changes, no backend.
