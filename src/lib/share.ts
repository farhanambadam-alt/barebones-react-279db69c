import { toast } from 'sonner';
import {
  isFlutterEnvironment,
  callFlutterHandler,
  validateSharePayload,
} from '@/lib/nativeBridge';

interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * Share content using the best available method:
 * 1. Flutter bridge (inside InAppWebView)
 * 2. Web Share API (mobile browsers)
 * 3. Clipboard fallback (desktop browsers)
 */
export async function shareContent(data: ShareData) {
  console.log('[SHARE] Button clicked');

  // Validate payload before doing anything
  if (!validateSharePayload(data)) {
    console.error('[SHARE] Aborted — invalid payload');
    return;
  }

  if (isFlutterEnvironment()) {
    console.log('[SHARE] Environment: Flutter');
    callFlutterHandler('shareContent', data);
    return;
  }

  console.log('[SHARE] Environment: Browser');

  // Web Share API (mostly mobile browsers)
  if (navigator.share) {
    console.log('[SHARE] Using Web Share API');
    try {
      await navigator.share(data);
    } catch (e) {
      // User cancelled — not an error
      if ((e as DOMException)?.name !== 'AbortError') {
        console.error('[SHARE] Web Share API error:', e);
      }
    }
    return;
  }

  // Desktop fallback — copy to clipboard
  console.log('[SHARE] Fallback: clipboard copy');
  try {
    await navigator.clipboard.writeText(data.url);
    toast.success('Link copied to clipboard');
  } catch {
    // Fallback for older browsers / iframe restrictions
    const ta = document.createElement('textarea');
    ta.value = data.url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast.success('Link copied to clipboard');
  }
}
