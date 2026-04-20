/**
 * Centralized Flutter ↔ React bridge utility.
 *
 * Single source of truth for:
 *   - environment detection (Flutter vs Browser)
 *   - calling Flutter handlers with validation + logging
 *   - safe fallback when Flutter is unavailable
 *
 * ⚠️  This module is INTERNAL. It does NOT change any handler names,
 *     payload shapes, or execution flow. Existing modules route their
 *     calls through here for consistency, validation, and logging.
 *
 * Handler registry (React → Flutter):
 *   routeChanged(path: string)
 *   shareContent({ title, text, url })
 *   openDirections({ lat, lng, address })
 *   mapActive(boolean)
 *   requestLocation()
 *   enableLocationServices()
 *   checkLocationStatus()
 *
 * Callbacks (Flutter → React — registered elsewhere):
 *   window.setLocationFromNative(data)
 *   window.setLocationError(msg)
 *   window.onLocationServicesEnabled()
 *   window.setLocationCheckResult(data)
 *   window.navigateTo(path)
 *   window.appBack()
 *   window.isRootRoute()
 */

const LOG_PREFIX = '[BRIDGE]';

// ─── Environment detection ───────────────────────────────────────

/** True when running inside the Flutter InAppWebView shell. */
export function isFlutterEnvironment(): boolean {
  return !!window.flutter_inappwebview;
}

// ─── Core bridge call ────────────────────────────────────────────

/**
 * Safely call a Flutter handler.
 *
 * Returns `true` if the call was dispatched to Flutter,
 * `false` if the bridge is unavailable (caller should use web fallback).
 *
 * @param handler  The registered Flutter handler name (unchanged).
 * @param payload  Optional payload — sent as-is to preserve the contract.
 */
export function callFlutterHandler(
  handler: string,
  payload?: unknown,
): boolean {
  if (!window.flutter_inappwebview) {
    console.log(`${LOG_PREFIX} Flutter unavailable → web fallback for "${handler}"`);
    return false;
  }

  try {
    if (payload !== undefined) {
      console.log(`${LOG_PREFIX} → ${handler}`, payload);
      window.flutter_inappwebview.callHandler(handler, payload);
    } else {
      console.log(`${LOG_PREFIX} → ${handler}`);
      window.flutter_inappwebview.callHandler(handler);
    }
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX} Error calling "${handler}":`, err);
    return false;
  }
}

// ─── Payload validators ──────────────────────────────────────────
// These log warnings and return false when invalid.
// They NEVER throw — callers decide how to handle the failure.

export function validateSharePayload(
  data: unknown,
): data is { title: string; text: string; url: string } {
  if (
    data &&
    typeof data === 'object' &&
    typeof (data as Record<string, unknown>).title === 'string' &&
    typeof (data as Record<string, unknown>).text === 'string' &&
    typeof (data as Record<string, unknown>).url === 'string'
  ) {
    return true;
  }
  console.warn(`${LOG_PREFIX} Invalid shareContent payload`, data);
  return false;
}

export function validateDirectionsPayload(
  data: unknown,
): data is { lat: number; lng: number; address: string } {
  if (
    data &&
    typeof data === 'object' &&
    typeof (data as Record<string, unknown>).lat === 'number' &&
    typeof (data as Record<string, unknown>).lng === 'number' &&
    typeof (data as Record<string, unknown>).address === 'string' &&
    isFinite((data as Record<string, unknown>).lat as number) &&
    isFinite((data as Record<string, unknown>).lng as number)
  ) {
    return true;
  }
  console.warn(`${LOG_PREFIX} Invalid openDirections payload`, data);
  return false;
}
