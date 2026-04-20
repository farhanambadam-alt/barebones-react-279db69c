# Cursor AI Prompt — Native Directions for ChicSalon Flutter WebView

> **Copy-paste this entire prompt into Cursor AI to add native Google Maps directions to the Flutter project.**

---

## OVERVIEW

Add a native directions handler to the existing ChicSalon Flutter WebView shell.
When the user taps "Directions" in the React web app, Flutter opens **Google Maps** (app or browser fallback) with navigation to the salon.

**CRITICAL**: This is a one-way fire-and-forget call. React sends the destination; Flutter opens the map. No callback is needed.

---

## ARCHITECTURE

```
React (Web App)                         Flutter (Native Shell)
───────────────                         ──────────────────────
User taps "Directions"
  → openDirections()
    → callHandler('openDirections', {   ──►  Receives handler call
        lat: 12.9716,                        → Build Google Maps intent
        lng: 77.5946,                        → Try launching native app
        address: "Koramangala..."            → Fallback to browser
      })
                                             → Log each step
```

---

## BRIDGE CONTRACT (SINGLE SOURCE OF TRUTH)

| Property       | Value                |
|---------------|----------------------|
| Handler name  | `openDirections`     |
| Payload type  | `Map<String, dynamic>` |

### Payload shape:

```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "address": "Koramangala, Bangalore"
}
```

All three fields are always present. `lat` and `lng` are `double`. `address` is `String`.

---

## DEPENDENCIES TO ADD (pubspec.yaml)

```yaml
dependencies:
  url_launcher: ^6.2.0
```

After adding, run:
```bash
flutter pub get
```

---

## ANDROID CONFIGURATION

Add these `<queries>` inside `AndroidManifest.xml` (inside the top-level `<manifest>` tag, NOT inside `<application>`):

```xml
<queries>
  <!-- Allow checking if Google Maps is installed -->
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="google.navigation" />
  </intent>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="https" />
  </intent>
</queries>
```

---

## IMPLEMENTATION

### Where to add the handler

In your existing `_WebViewScreenState` class, inside the `onWebViewCreated` callback, add the handler alongside the existing ones.

### Required import

Add this at the top of `main.dart`:

```dart
import 'package:url_launcher/url_launcher.dart';
```

---

## COMPLETE EXAMPLE (handler placement)

Your `onWebViewCreated` should look like this after adding the handler:

```dart
onWebViewCreated: (controller) {
  _controller = controller;

  // ── EXISTING handlers ──
  controller.addJavaScriptHandler(
    handlerName: 'routeChanged',
    callback: (args) { 
      // Existing logic for routeChanged
    },
  );

  controller.addJavaScriptHandler(
    handlerName: 'mapActive',
    callback: (args) { 
      // Existing logic for mapActive
    },
  );

  controller.addJavaScriptHandler(
    handlerName: 'checkLocationStatus',
    callback: (args) { 
      // Existing logic for checkLocationStatus
    },
  );

  controller.addJavaScriptHandler(
    handlerName: 'requestLocation',
    callback: (args) { 
      // Existing logic for requestLocation
    },
  );

  controller.addJavaScriptHandler(
    handlerName: 'enableLocationServices',
    callback: (args) { 
      // Existing logic for enableLocationServices
    },
  );

  // ── NEW: Directions handler ──
  controller.addJavaScriptHandler(
    handlerName: 'openDirections',
    callback: (args) async {
      debugPrint('[MAP] openDirections received');

      if (args.isEmpty) {
        debugPrint('[MAP] ERROR: No payload received');
        return;
      }

      final data = args[0] as Map<String, dynamic>;
      final double lat = (data['lat'] as num).toDouble();
      final double lng = (data['lng'] as num).toDouble();
      final String address = data['address'] as String? ?? '';

      debugPrint('[MAP] Destination: $lat, $lng ($address)');

      final nativeUri = Uri.parse('google.navigation:q=$lat,$lng');
      debugPrint('[MAP] Trying native maps: $nativeUri');

      if (await canLaunchUrl(nativeUri)) {
        debugPrint('[MAP] Launching native Google Maps');
        await launchUrl(nativeUri);
        return;
      }

      final browserUri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
      );
      debugPrint('[MAP] Fallback to browser: $browserUri');

      if (await canLaunchUrl(browserUri)) {
        await launchUrl(browserUri, mode: LaunchMode.externalApplication);
      } else {
        debugPrint('[MAP] ERROR: Cannot launch any maps URL');
      }
    },
  );
},
```

---

## VALIDATION MATRIX

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Browser (no Flutter) | Opens Google Maps in new tab via `window.open` |
| 2 | Flutter + Google Maps installed | Opens Google Maps app with navigation to destination |
| 3 | Flutter + Google Maps NOT installed | Opens browser with Google Maps directions URL |

---

## CRITICAL RULES

- ❌ **DO NOT** create a new handler name — it MUST be `openDirections`
- ❌ **DO NOT** navigate the WebView to a maps URL
- ❌ **DO NOT** intercept URL loading to detect maps links
- ❌ **DO NOT** send a callback to React — this is fire-and-forget
- ✅ **DO** use `url_launcher` for both native intent and browser fallback
- ✅ **DO** cast `lat`/`lng` from `num` to `double` (JavaScript sends `num`)
- ✅ **DO** add the `<queries>` block to AndroidManifest.xml

---

## TESTING CHECKLIST

- [ ] Tap "Directions" button on salon detail page
- [ ] Verify `[MAP] openDirections received` appears in Flutter logs
- [ ] On device with Google Maps: verify native app opens with correct destination
- [ ] On device without Google Maps: verify browser opens with correct URL
- [ ] Verify existing handlers (location, navigation, back) still work
- [ ] Verify no WebView navigation occurs (stays on salon page)
