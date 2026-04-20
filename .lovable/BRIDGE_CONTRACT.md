# Flutter ↔ React Bridge Contract

> **Status**: Frozen — no handler name or payload changes allowed  
> **Source of Truth**: `src/lib/nativeBridge.ts` + `src/hooks/useFlutterBridge.ts`  
> **Last Updated**: 2026-04-06

---

## 1. Architecture

| File | Purpose |
|---|---|
| `src/lib/nativeBridge.ts` | Core bridge utility — environment detection, handler calls, payload validation |
| `src/hooks/useFlutterBridge.ts` | React hook — route sync, overlay stack, `navigateTo`/`appBack`/`isRootRoute` |
| `src/components/FlutterBridge.tsx` | Invisible component mounting the hook |
| `src/lib/openDirections.ts` | Directions launcher (uses bridge internally) |
| `src/lib/share.ts` | Share content (uses bridge internally) |

---

## 2. Bridge Enforcement Rule (CRITICAL)

> **This is a non-negotiable architecture rule.**

- **ALL** React → Flutter calls **MUST** go through `src/lib/nativeBridge.ts` only
- Direct usage of `window.flutter_inappwebview.callHandler()` anywhere else is **STRICTLY FORBIDDEN**
- All payloads **MUST** be validated before dispatch using the validator functions in `nativeBridge.ts`
- All bridge calls **MUST** log via `[BRIDGE]` prefix
- No module may import `window.flutter_inappwebview` directly — only `nativeBridge.ts` touches it

**Why**: Scattered bridge calls across files caused inconsistency bugs. This rule prevents regression.

---

## 3. Platform Behavior Contract

Every feature **MUST** support both environments:

### Flutter WebView
- Use native bridge via `callFlutterHandler()` from `nativeBridge.ts`
- Detection: `isFlutterEnvironment()` returns `true`

### Browser (Desktop/Mobile Web)
- Use web APIs or fallback behavior
- Detection: `isFlutterEnvironment()` returns `false`

### Rules
1. **No feature may depend ONLY on Flutter** — web must always work
2. **No feature may break on web** — graceful degradation required
3. **Fallback must always exist** — every `callFlutterHandler` call site must handle the `false` return
4. **Feature parity is NOT required** — web can offer reduced functionality (e.g., clipboard instead of native share)

### Current Fallback Map

| Feature | Flutter | Web Fallback |
|---|---|---|
| Share | Native share sheet | Web Share API → clipboard copy |
| Directions | Native maps app | Google Maps URL in new tab |
| Location | Native GPS | Browser Geolocation API |
| Back button | `appBack()` from Flutter | Browser back (popstate blocked) |
| Camera | `requestCameraForReview` | `<input type="file" capture>` |
| Payment | `openPayment` → PhonePe SDK | Redirect to PhonePe web checkout |
| Push notifications | FCM via Flutter | Not available (graceful no-op) |

---

## 4. React → Flutter Handlers (Current)

| Handler | Payload | Purpose |
|---|---|---|
| `routeChanged` | `path: string` | Notify Flutter of every route change |
| `shareContent` | `{ title, text, url }` | Trigger native share sheet |
| `openDirections` | `{ lat, lng, address }` | Open native maps for directions |
| `mapActive` | `boolean` | Tell Flutter to enable/disable focus on map |
| `requestLocation` | none | Request GPS coordinates from native |
| `enableLocationServices` | none | Open device location settings |
| `checkLocationStatus` | none | Check if location services are enabled |

---

## 5. Flutter → React Callbacks (Current)

| Window Function | Payload | Purpose |
|---|---|---|
| `navigateTo(path)` | `string` | Flutter-initiated navigation |
| `appBack()` | none | Hardware/gesture back button pressed |
| `isRootRoute()` | returns `boolean` | Flutter asks if app should exit |
| `setLocationFromNative(data)` | `{ lat, lng }` | GPS result from native |
| `setLocationError(msg)` | `string` | GPS error from native |
| `onLocationServicesEnabled()` | none | User enabled location in settings |
| `setLocationCheckResult(data)` | `{ enabled: boolean }` | Location status check result |

---

## 6. Navigation Ownership

> **React Router is the SINGLE source of truth for UI navigation.**

- Flutter **MUST NOT** control navigation logic directly
- Flutter only:
  - Triggers back (`appBack`)
  - Checks root (`isRootRoute`)
  - Sends navigation intents (`navigateTo`)
- React **MUST** always emit `routeChanged(path)` after any navigation
- This ensures both layers stay in sync

### Route Stack Rules
- Internal stack: `routeStack: string[]` in `useFlutterBridge.ts`
- **Tab routes** (`/`, `/at-home`, `/explore`, `/bookings`, `/profile`): Replace top of stack
- **Inner pages** (`/salon/:id`, `/booking/:id`): Push onto stack
- Home route (`/`): Resets stack to `['/']`
- `cleanRouteStack(prefix)`: Removes all entries matching prefix

### Back Navigation Logic
1. **Overlay open?** → Close topmost overlay, stay on route
2. **Non-home tab?** → Navigate to `/` (home), replace stack
3. **Home or stack ≤ 1?** → Return without navigating (Flutter handles app exit)
4. **Inner page?** → Pop stack, navigate to previous route with `replace: true`

### Guards
- Back guard: 300ms debounce prevents stale `navigateTo` calls after back
- PopState blocked: `popstate` event intercepted, browser URL synced to stack top
- Same-route guard: `navigateTo` ignored if already on target route

---

## 7. Overlay Stack System

Drawers and modals register with the overlay stack to ensure `appBack` closes them before navigating:

```typescript
import { pushOverlay, removeOverlay } from '@/hooks/useFlutterBridge';

useEffect(() => {
  if (!open) return;
  const closeFn = () => handleClose();
  pushOverlay(closeFn);
  return () => removeOverlay(closeFn);
}, [open]);
```

**Components using overlay stack**:
- `InstagramMediaDrawer`, `YouTubeShortDrawer`, `MediaLightbox`
- `ServiceDrawer`, `PromoDrawer`
- `LocationPickerDrawer`, `NotificationDrawer`

---

## 8. Future Handlers (Pre-Registered Names)

> **Names are FROZEN. No renaming allowed.**

| Handler | Direction | Payload | Purpose |
|---|---|---|---|
| `openPayment` | React → Flutter | `{ amount, orderId, merchantId }` | Open PhonePe payment SDK |
| `paymentResult` | Flutter → React | `{ success, transactionId, error? }` | Payment completion callback |
| `requestCameraForReview` | React → Flutter | `{ type: 'photo' \| 'video' }` | Open camera for portfolio upload |
| `showNotification` | React → Flutter | `{ title, body, data? }` | Show local notification |
| `checkLocationForBooking` | React → Flutter | `{ salonLat, salonLng, appointmentTime }` | Start background location tracking |
| `setPushToken` | Flutter → React | `{ token: string }` | FCM/APNs token delivery |
| `notificationOpened` | Flutter → React | `{ path: string, params: object }` | Deep-link on notification tap |

---

## 9. External Intent Handling

When the app is opened via:
- **Notification tap** → Flutter passes context via `notificationOpened`
- **Deep link / URL scheme** → Flutter passes via `navigateTo`
- **Google Maps return** → App resumes, no action needed (state preserved)
- **External share return** → App resumes, no action needed

React must:
- Restore the correct screen based on `path` in the payload
- Restore state if needed (e.g., booking details for a notification deep-link)
- Never assume a clean launch — always handle mid-session intents

---

## 10. Bridge Rules (Immutable)

1. **No handler name changes** — ever. Names are frozen.
2. **No payload shape changes** — additive only (new optional fields OK, removal forbidden)
3. **Web fallbacks required** — every React → Flutter call must have a browser fallback
4. **Validation before dispatch** — use `validateSharePayload()`, `validateDirectionsPayload()`, etc.
5. **Logging** — all bridge calls logged with `[BRIDGE]` prefix
6. **Error handling** — bridge calls wrapped in try/catch, never throw
7. **Single entry point** — only `nativeBridge.ts` may access `window.flutter_inappwebview`

---

*This document is referenced by the main PRD. Changes require careful review of both Flutter and React codebases.*
