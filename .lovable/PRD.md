# GoGo Salon — Product Requirements Document

> **Version**: 2.0  
> **Last Updated**: 2026-04-06  
> **Status**: Living Document  
> **Repository**: Customer App (React in Flutter WebView)

---

## Document Map

This PRD is split into focused files for reliable AI consumption:

| File | Contents |
|---|---|
| **`.lovable/PRD.md`** | This file — product vision, app specs, features, architecture rules |
| **`.lovable/BRIDGE_CONTRACT.md`** | Flutter ↔ React bridge handlers, rules, navigation ownership |
| **`.lovable/BACKEND_SCHEMA.md`** | Database table designs, RLS policies, data consistency rules |
| **`.lovable/ROADMAP.md`** | 7-phase implementation checklist |

---

## Table of Contents

1. [Product Vision & Philosophy](#1-product-vision--philosophy)
2. [Architecture Enforcement Rules](#2-architecture-enforcement-rules)
3. [Customer App: Current State](#3-customer-app-current-state)
4. [Customer App: Planned Features](#4-customer-app-planned-features)
5. [Partner App Spec](#5-partner-app-spec)
6. [Company Dashboard Spec](#6-company-dashboard-spec)
7. [Disruptive Features ("Special Sauce")](#7-disruptive-features-special-sauce)
8. [Smart Features](#8-smart-features)
9. [Technical Architecture](#9-technical-architecture)
10. [Current Technical Debt](#10-current-technical-debt)

---

## 1. Product Vision & Philosophy

### 1.1 Mission

Eliminate booking friction in the Indian salon and grooming industry. Every booking should take **under 4 taps**. No unnecessary screens, no unnecessary decisions.

### 1.2 Ecosystem Overview

| Component | Technology | Status |
|---|---|---|
| **Customer App** | React 18 in Flutter InAppWebView (Android + iOS) | Active — this repo |
| **Partner App** | Separate Flutter/React project | Future — Phase 6 |
| **Company Dashboard** | Desktop web admin panel | Future — Phase 7 |

### 1.3 Core Principles

1. **Zero friction booking** — under 4 taps from open to confirmed
2. **Real-world salon dynamics** — walk-in sync, not just online scheduling
3. **Noise marketing** — the Trojan Bell turns every online booking into in-salon advertising
4. **Reliability tracking** — transparent no-show counters, not hidden algorithms
5. **Barber-first partner UX** — one-click walk-in entry, no complex dashboards for employees

### 1.4 Target Market

- **Primary**: India — metro and Tier-2 cities
- **Users**: Salon customers (men & women), salon owners, salon employees
- **Currency**: INR (₹)
- **Languages**: English (initial), Hindi (future)

---

## 2. Architecture Enforcement Rules

> **These rules are NON-NEGOTIABLE. They prevent classes of bugs we've already fixed.**

### 2.1 Bridge Enforcement Rule (CRITICAL)

- **ALL** React → Flutter calls **MUST** go through `src/lib/nativeBridge.ts` only
- Direct usage of `window.flutter_inappwebview.callHandler()` anywhere else is **STRICTLY FORBIDDEN**
- All payloads **MUST** be validated before dispatch
- All bridge calls **MUST** log via `[BRIDGE]` prefix
- No module may import `window.flutter_inappwebview` directly

**Why**: Scattered bridge calls across 5+ files caused inconsistency bugs. Centralization fixed it permanently.

> Full bridge contract details → [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md)

### 2.2 Async State Integrity Rule (CRITICAL)

- Once a state reaches a **terminal success state** (e.g., `READY`, `SUCCESS`, `COMPLETED`), it **MUST NEVER** be overridden by any async fallback
- All critical state transitions must use a **lock mechanism**:

```typescript
// Example: location detection
const hasResolvedRef = useRef(false);

if (hasResolvedRef.current) return; // ignore late callbacks
hasResolvedRef.current = true;
setStatus('ready');
```

- Any subsequent async failure after a success lock **MUST** be silently ignored

**Applies to**:
- Location detection (`LocationContext`)
- Payment status (future)
- Booking confirmation (future)
- Notification handling (future)

**Why**: Race conditions between Flutter bridge callbacks and browser API callbacks caused state flicker and blank screens. The lock pattern fixed it.

### 2.3 Platform Behavior Contract

Every feature **MUST** support both environments:

1. **Flutter WebView** → Use native bridge via `callFlutterHandler()`
2. **Browser (Desktop/Mobile Web)** → Use web APIs or fallback behavior

**Detection**: `isFlutterEnvironment()` from `nativeBridge.ts`

**Rules**:
- No feature may depend **ONLY** on Flutter
- No feature may **break** on web
- Fallback must **always** exist
- Feature parity is NOT required — web can offer reduced functionality

> Full fallback map → [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md)

### 2.4 Navigation Ownership

- **React Router** is the SINGLE source of truth for UI navigation
- Flutter **MUST NOT** control navigation logic directly
- Flutter only: triggers back (`appBack`), checks root (`isRootRoute`), sends intents (`navigateTo`)
- React **MUST** always emit `routeChanged(path)` after any navigation

> Full navigation rules → [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md)

### 2.5 Data Consistency Rule

- Database schema **MUST** match existing TypeScript interfaces exactly
- **No renaming fields** without updating UI types in lockstep
- Hooks **MUST** preserve their return shape after migration from mock → DB
- Components consuming hooks must NOT need changes during DB migration

**Example**: `useSalons()` must always return `{ featuredSalons, nearbySalons, allSalons, isLoading, error }`

> Full schema details → [BACKEND_SCHEMA.md](./BACKEND_SCHEMA.md)

### 2.6 Logging & Observability Rule

- All bridge calls must log: `[BRIDGE] handlerName + payload`
- All critical flows must log with domain prefix: `[LOCATION]`, `[BOOKING]`, `[PAYMENT]`, `[SHARE]`, `[MAP]`
- Errors must **NEVER** fail silently
- Always log **before** fallback execution
- In production: replace `console.log` with structured logging (future)

### 2.7 External Intent Handling

When the app is opened via notification tap, deep link, or external return:
- Flutter must pass context via `notificationOpened` / `navigateTo`
- React must restore the correct screen and state
- Never assume a clean launch — always handle mid-session intents

> Full intent handling rules → [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md)

---

## 3. Customer App: Current State

Everything documented below **exists today** and is functional with mock data.

### 3.1 Navigation Architecture

**5-tab bottom navigation**:

| Tab | Route | Page Component |
|---|---|---|
| At Salon | `/` | `Index.tsx` |
| At Home | `/at-home` | `AtHome.tsx` |
| Explore | `/explore` | `Explore.tsx` |
| Bookings | `/bookings` | `Bookings.tsx` |
| Profile | `/profile` | `Profile.tsx` |

**Inner routes**: `/salon/:id`, `/booking/:id`, `/artist/:id`, `/at-home-booking/:id`, `/offers`, `*` (404)

**Code splitting**: All pages use `React.lazy()` with `<FullPageSpinner />` fallback.

### 3.2 App Shell (`App.tsx`)

```
QueryClientProvider → GenderProvider → LocationProvider → CartProvider → FavoritesProvider
  └─ BrowserRouter
      ├─ FlutterBridge (invisible)
      └─ LocationGate → Main layout (Routes + BottomNav + CartPill)
```

### 3.3 Home Screen (`Index.tsx`)

Sections: AppHeader → GenderToggle → SearchBar → CategoryChips → FeaturedCarousel → NearbySalons → SuggestedForYou → BookAgain

### 3.4 Salon Detail (`SalonDetail.tsx`) — 891 lines

- Hero image carousel with share/favorite
- 4-tab profile: **Services** | **About** | **Reviews** | **Gallery**
- Services grouped by subcategory with accent bars
- Packages + Offers drawers with external close buttons
- Cart system with salon-switch modal
- Journey card with directions

### 3.5 Booking Flow (`BookingFlow.tsx`)

3-step wizard: Date/Time → Specialist → Summary → Confirm

### 3.6 Other Pages

- **At Home**: Artist discovery placeholder
- **Explore**: Search + filter + sort
- **Bookings**: 3 tabs (upcoming/completed/cancelled) with actions
- **Profile**: Edit profile, saved salons, logout

### 3.7 Context Providers

| Context | Persistence |
|---|---|
| Gender | In-memory |
| Location | localStorage (cached) |
| Cart | In-memory (lost on refresh) |
| Favorites | localStorage |

### 3.8 Mock Data

- `src/data/mockData.ts`: 13 categories, 6 salons, 29 services, 8 artists, 10 reviews, 3 bookings
- `src/data/atHomeData.ts`: at-home artists, services, reviews

---

## 4. Customer App: Planned Features

### 4.1 Authentication
- Google Auth via Lovable Cloud
- Profile auto-created on first login

### 4.2 Real Database
- Replace all mock data with Lovable Cloud tables
- Image storage in Supabase Storage

### 4.3 Booking CRUD
- Create with conflict detection
- Cancel with reason + slot release
- Reschedule

### 4.4 Payment Integration
- PhonePe via Flutter bridge (`openPayment` → `paymentResult`)
- Conditional "Pay at Salon" toggle (salon owner controls per-customer)

### 4.5 Push Notifications
- FCM token sync via `setPushToken`
- Deep-link on tap via `notificationOpened`

### 4.6 Late Detection & Auto-Cancel
1. Flutter tracks location in background
2. T-5 min: check if user can arrive on time
3. If too far → backend marks booking `late`
4. T+5 min grace → auto-cancel if no arrival
5. Push notifications to both customer and salon
6. No-show counter incremented

### 4.7 Streak-Based Loyalty
- Flame counter per customer per salon
- Salon owner sets reward threshold

### 4.8 Customer Reliability Score
- No-show counter visible only to barber
- 3+ no-shows = yellow flag

### 4.9 Barber Portfolios
- Customer-uploaded photos only
- On-device face blur (TensorFlow.js / ML Kit)

---

## 5. Partner App Spec (Future — Separate Codebase)

### 5.1 Access Levels

| Role | Access |
|---|---|
| **Admin** (Owner) | Full dashboard, settings, analytics, cash toggle, Trojan Bell |
| **Employee** (Barber) | Walk-in button, today's schedule, client info |

### 5.2 Employee Interface
- Walk-in FAB → service selection → auto-schedule sync
- Today's schedule, current client, next client preview

### 5.3 Admin Interface
- Dashboard: earnings, bookings, ratings, growth
- Booking management: accept/decline/reschedule
- Service CRUD, calendar, business settings
- Cash payment toggle per-customer

---

## 6. Company Dashboard Spec (Future — Desktop)

- Executive dashboard: revenue, users, bookings, partners
- User & salon management
- Payment + commission tracking
- Service category control with commission rates
- Banner campaigns, promotion engine
- Trojan Bell jingle management

---

## 7. Disruptive Features ("Special Sauce")

### 7.1 Trojan Bell
Online booking → push notification → loud branded jingle on partner's device. Walk-in customers hear it = free marketing.

### 7.2 Barber Portfolios
Customer-uploaded photos only. On-device face blur. Authenticity > marketing.

### 7.3 Streak-Based Loyalty
Simple flame counter. No points, no tiers. Salon owner sets reward.

### 7.4 Search Ranking
`Ranking = Total Customers + High-Star Reviews (4-5★) + Rewards Redeemed`

### 7.5 Customer Reliability Score
No-show counter. 3+ = yellow flag visible to barber only. Customer never sees it.

---

## 8. Smart Features

### 8.1 30-Minute Check-In
Push notification → "On My Way" button → barber sees "en route" status.

### 8.2 Late Detection & Auto-Cancel
Flutter background location → GPS vs salon vs travel time → 5-min grace → auto-cancel → new slot suggestion.

### 8.3 Conditional Payment
PhonePe default. "Pay at Salon" toggled per-customer by salon owner.

---

## 9. Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind v3 + TypeScript 5 |
| UI | shadcn/ui (Radix + Tailwind) |
| State | React Context (Cart, Gender, Location, Favorites) |
| Data | TanStack React Query v5 |
| Backend | Lovable Cloud (Supabase) |
| Native | Flutter InAppWebView |
| Maps | Ola Maps API via `ola-maps-proxy` edge function |
| Directions | Google Maps (web) / native maps (Flutter) |
| Payment | PhonePe SDK (future) |
| Push | FCM (future) |

### Edge Functions

| Function | Purpose |
|---|---|
| `ola-maps-proxy` | Reverse geocoding + autocomplete via Ola Maps OAuth |

**Secrets**: `OLA_CLIENT_ID`, `OLA_CLIENT_SECRET`, `OLA_MAPS_API_KEY`

---

## 10. Current Technical Debt

### 10.1 Debug Code (Remove Before Production)
- `useFlutterBridge.ts`: 9 debug log statements + history monkey-patch block (lines 62-84)
- All marked with `// 🔧 DEBUG`

### 10.2 Mock Data
- `src/data/mockData.ts` and `src/data/atHomeData.ts` — replace with DB queries
- Components importing mock data: `SalonDetail.tsx`, `BookingFlow.tsx`, `Index.tsx`, `useSalons.ts`

### 10.3 Missing Infrastructure
- Authentication, database tables, payment, push notifications
- Cart lost on refresh, favorites localStorage-only
- At Home page mostly placeholder

### 10.4 File Size Concerns
- `SalonDetail.tsx` (891 lines) — split into sub-components
- `LocationContext.tsx` (495 lines) — complex startup logic
- `BookingFlow.tsx` (446 lines) — 3-step wizard in single file

---

## Appendix A: TypeScript Interfaces

> See `src/types/salon.ts` and `src/types/atHome.ts` for current interfaces.
> Schema mapping details → [BACKEND_SCHEMA.md](./BACKEND_SCHEMA.md)

## Appendix B: Design System

- HSL-based semantic tokens in `index.css`
- Gender theming (blue/pink gradient backgrounds)
- shadcn/ui with custom variants
- Full token list: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`

## Appendix C: Edge Function — `ola-maps-proxy`

- Location: `supabase/functions/ola-maps-proxy/index.ts`
- Actions: `reverse-geocode`, `autocomplete`
- Auth: OAuth 2.0 client credentials with token caching

---

## 11. AI Execution Rules

These rules govern how any AI agent (Lovable, Cursor, Copilot, or manual prompts) must behave when modifying this codebase.

### 11.1 AI EXECUTION RULES

1. **Read before write** — Before modifying ANY file, the AI MUST read its current contents. No assumptions based on memory or prior context.
2. **Scope lock** — Only modify files directly related to the user's request. Adjacent files may be read for context but MUST NOT be changed unless explicitly required.
3. **No speculative features** — Never add functionality, handlers, UI elements, or database tables that were not explicitly requested.
4. **Preserve existing tests** — If tests exist, they must still pass after changes. If tests break, fix the test-breaking code, not the tests.
5. **No silent removals** — Never remove code, comments, handlers, or fallbacks without explicit user approval.
6. **Mock data rule** — Mock data files (`src/data/mockData.ts`, `src/data/atHomeData.ts`) may only be modified to add/update data. They must never be deleted until real database integration replaces them.
7. **Type safety** — All new code must be fully typed. No `any` casts unless wrapping third-party APIs where types are unavailable. Window callback registrations (`(window as any).handlerName`) are the only permitted exception.

### 11.2 REGRESSION PREVENTION RULE

Before completing ANY code change, the AI must verify:

1. **Bridge integrity** — `window.flutter_inappwebview.callHandler` appears ONLY in `src/lib/nativeBridge.ts`. Zero other files.
2. **Overlay stack** — All drawers/modals that should respond to back-button MUST call `pushOverlay` on open and `removeOverlay` on close.
3. **Navigation sync** — Every programmatic navigation MUST trigger `routeChanged` to keep Flutter in sync.
4. **State locks** — Any async flow with a terminal success state (location ready, payment complete, booking confirmed) MUST use a ref-based lock (`hasResolvedRef` pattern) to prevent late callbacks from overriding success.
5. **Platform fallbacks** — Every feature using a Flutter bridge handler MUST have a working browser fallback path.
6. **Cart isolation** — Cart operations must never trigger navigation. Salon-switch modal must appear when adding services from a different salon.
7. **Scroll position** — Route changes must not cause unexpected scroll jumps. `ScrollToTop` component handles this.

### 11.3 CHANGE ISOLATION RULE

When making changes:

1. **One concern per change** — A UI fix must not alter business logic. A data change must not alter UI layout. A bridge change must not alter state management.
2. **No cascading refactors** — If a change requires modifying more than 5 files, STOP and ask the user for confirmation before proceeding.
3. **Preserve debug-ability** — Do not remove `console.log` statements prefixed with `[BRIDGE]`, `[LOCATION]`, `[MAP]`, or `[SHARE]` unless explicitly asked. These are observability anchors.
4. **Context boundaries** — Changes to `CartContext`, `LocationContext`, `GenderContext`, or `FavoritesContext` must be isolated. A change to one context must never require changes to another.
5. **Component boundaries** — Shared components in `src/components/ui/` must NEVER contain business logic. They are pure presentation components only.

---

*End of PRD v2.1 — for detailed specs, see the linked documents above.*
