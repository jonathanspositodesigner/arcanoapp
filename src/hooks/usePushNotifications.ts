import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key - safe to expose (it's a public key)
const VAPID_PUBLIC_KEY = 'BGO6Xj5pBSTz_0Z9SFnDQNwJIj7Oe9gIvml2MLPA1qTo0JrWc03FY_BzQ0qBgm1bzOdrAW9IfkFZxVrXjGq_pH0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        // Register push service worker
        const registration = await navigator.serviceWorker.register('/push-sw.js', {
          scope: '/'
        });

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Push notifications not supported');
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
          device_type: getDeviceType(),
          user_agent: navigator.userAgent
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

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

        // Unsubscribe
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
}
