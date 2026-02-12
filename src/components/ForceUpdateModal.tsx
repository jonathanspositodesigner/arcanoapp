import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import UpdateAvailableModal from './UpdateAvailableModal';

export const APP_VERSION = '5.3.0';

const LAST_FORCE_UPDATE_KEY = 'last_force_update';

export const ForceUpdateModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [forceUpdateAt, setForceUpdateAt] = useState('');

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'app_version')
          .single();

        if (error || !data) return;

        const value = data.value as { force_update_at?: string } | null;
        const dbTimestamp = value?.force_update_at;

        if (!dbTimestamp) return;

        const lastAcknowledged = localStorage.getItem(LAST_FORCE_UPDATE_KEY);

        if (!lastAcknowledged || new Date(dbTimestamp) > new Date(lastAcknowledged)) {
          setForceUpdateAt(dbTimestamp);
          setShowModal(true);
        }
      } catch (e) {
        console.warn('[ForceUpdateModal] Check failed:', e);
      }
    };

    checkForUpdate();
  }, []);

  if (!showModal) return null;

  return <UpdateAvailableModal forceUpdateAt={forceUpdateAt} />;
};

export default ForceUpdateModal;
