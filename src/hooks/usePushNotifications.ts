import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key - must match the one in Supabase secrets
const VAPID_PUBLIC_KEY = 'BLAgxGfZ7touE5QdP1JUoaN8N_HWYT7V2JAXH36oZEqSdWVplpmLVpqdKU8pO6OOD-EoUcMZdfJBHt3xXJBPw0s';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
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

      setIsSupported(true);
      setPermission(Notification.permission);

      try {
        // Wait for PWA service worker to be ready (registered by VitePWA)
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready');

        // Check for existing subscription
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify it exists in our database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

          if (data) {
            console.log('[Push] Valid subscription found');
            setIsSubscribed(true);
          } else {
            // Orphan subscription - clean it up
            console.log('[Push] Orphan subscription found, cleaning up');
            await subscription.unsubscribe();
            setIsSubscribed(false);
          }
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('[Push] Error checking status:', error);
        setIsSubscribed(false);
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
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[Push] Removing existing subscription');
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', existingSubscription.endpoint);
        await existingSubscription.unsubscribe();
      }

      // Create new subscription
      console.log('[Push] Creating new subscription with VAPID key');
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer
      });

      const json = subscription.toJSON();
      console.log('[Push] Subscription created:', json.endpoint?.substring(0, 50));

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          device_type: getDeviceType(),
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('[Push] Database error:', error);
        await subscription.unsubscribe();
        return false;
      }

      console.log('[Push] Subscription saved successfully');
      setIsSubscribed(true);
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
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
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
