import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// LocalStorage key for subscription state
const STORAGE_KEY = 'push_notification_subscribed';
const ENDPOINT_KEY = 'push_notification_endpoint';

// Convert base64 to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get device type
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/tablet|playbook|silk/i.test(ua)) return 'tablet';
  return 'desktop';
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  // Inicialização síncrona do localStorage para resposta imediata
  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('push_notification_subscribed') === 'true';
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check support and current subscription status
  useEffect(() => {
    const checkStatus = async () => {
      // Check if push is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('[Push] Not supported in this browser');
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        console.error('[Push] VAPID_PUBLIC_KEY not configured');
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      // Quick check localStorage first for faster UI response
      const storedSubscribed = localStorage.getItem(STORAGE_KEY) === 'true';
      const storedEndpoint = localStorage.getItem(ENDPOINT_KEY);
      
      if (storedSubscribed && storedEndpoint) {
        console.log('[Push] Found stored subscription state, verifying...');
        // Temporarily set as subscribed for faster UI
        setIsSubscribed(true);
      }

      try {
        // Wait for PWA service worker to be ready (registered by VitePWA)
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready');

        // Check for existing subscription
        const subscription = await (registration as any).pushManager.getSubscription();
        
        if (subscription) {
          const endpoint = subscription.endpoint;
          console.log('[Push] Browser subscription found:', endpoint.substring(0, 50));
          
          // Verify it exists in our database
          const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', endpoint)
            .maybeSingle();

          if (error) {
            console.error('[Push] Database error:', error);
          }

          if (data) {
            console.log('[Push] Valid subscription confirmed in database');
            setIsSubscribed(true);
            localStorage.setItem(STORAGE_KEY, 'true');
            localStorage.setItem(ENDPOINT_KEY, endpoint);
          } else {
            // Subscription exists in browser but not in database
            // User must manually reactivate - don't auto-register
            console.log('[Push] Subscription not in database, requires manual activation');
            setIsSubscribed(false);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ENDPOINT_KEY);
          }
        } else {
          // No browser subscription - check if we have a stored endpoint
          if (storedEndpoint) {
            // Maybe the service worker was reinstalled, check database
            const { data } = await supabase
              .from('push_subscriptions')
              .select('id')
              .eq('endpoint', storedEndpoint)
              .maybeSingle();
            
            if (data) {
              // Database has record but browser doesn't - clean up
              console.log('[Push] Cleaning orphan database record');
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', storedEndpoint);
            }
          }
          
          console.log('[Push] No active subscription');
          setIsSubscribed(false);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(ENDPOINT_KEY);
        }
      } catch (error) {
        console.error('[Push] Error checking status:', error);
        // Don't clear localStorage on error - might be temporary
        setIsSubscribed(storedSubscribed);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('[Push] Not supported');
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        console.log('[Push] Permission denied');
        return false;
      }

      // Get service worker registration (PWA service worker)
      const registration = await navigator.serviceWorker.ready;

      // Clean up any existing subscription
      const existingSubscription = await (registration as any).pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[Push] Removing existing subscription');
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', existingSubscription.endpoint);
        await existingSubscription.unsubscribe();
      }

      // Create new subscription
      console.log('[Push] Creating new subscription with VAPID key:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer
      });

      const json = subscription.toJSON();
      console.log('[Push] Subscription created:', json.endpoint?.substring(0, 50));

      // Get current user for user_id association
      const { data: { user } } = await supabase.auth.getUser();

      // Save to database with discount eligibility and user_id
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          device_type: getDeviceType(),
          user_agent: navigator.userAgent,
          discount_eligible: true, // Mark as eligible for 20% discount
          user_id: user?.id || null // Associate with user for targeted notifications
        });

      if (error) {
        console.error('[Push] Database error:', error);
        await subscription.unsubscribe();
        return false;
      }

      console.log('[Push] Subscription saved successfully with discount eligibility');
      setIsSubscribed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(ENDPOINT_KEY, json.endpoint!);
      localStorage.setItem('push_discount_eligible', 'true'); // Store locally for quick access
      return true;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      // Also clean up stored endpoint if different
      const storedEndpoint = localStorage.getItem(ENDPOINT_KEY);
      if (storedEndpoint && (!subscription || subscription.endpoint !== storedEndpoint)) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', storedEndpoint);
      }

      setIsSubscribed(false);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ENDPOINT_KEY);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
}
