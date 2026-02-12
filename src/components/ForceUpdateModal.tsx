import { useEffect, useState } from 'react';
import UpdateAvailableModal from './UpdateAvailableModal';

export const APP_VERSION = '5.3.0';

const PWA_VERSION_KEY = 'pwa_version';

export const ForceUpdateModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [serverVersion, setServerVersion] = useState('');

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) return;

        const res = await fetch(`${supabaseUrl}/functions/v1/pwa-version`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) return;

        const { version } = await res.json();
        if (!version || version === 'unknown') return;

        const localVersion = localStorage.getItem(PWA_VERSION_KEY);

        if (!localVersion || localVersion !== version) {
          setServerVersion(version);
          setShowModal(true);
        }
      } catch (e) {
        console.warn('[ForceUpdateModal] Check failed:', e);
      }
    };

    checkForUpdate();
  }, []);

  if (!showModal) return null;

  return <UpdateAvailableModal serverVersion={serverVersion} />;
};

export default ForceUpdateModal;
