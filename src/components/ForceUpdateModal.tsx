import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import UpdateAvailableModal from './UpdateAvailableModal';

// Current app version - update this when publishing new code
export const APP_VERSION = '5.3.0';

export const ForceUpdateModal = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'app_version')
          .single();

        if (error || !data) return;

        const value = data.value as { latest_version?: string; force_update_at?: string } | null;
        const dbVersion = value?.latest_version;

        if (dbVersion && dbVersion !== APP_VERSION) {
          setLatestVersion(dbVersion);
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.warn('[ForceUpdateModal] Check failed:', e);
      }
    };

    checkForUpdate();
  }, []);

  if (!updateAvailable) return null;

  return <UpdateAvailableModal latestVersion={latestVersion} />;
};

export default ForceUpdateModal;
