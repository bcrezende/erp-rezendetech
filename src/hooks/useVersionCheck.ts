import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Feature {
  type: 'new' | 'improvement' | 'fix';
  description: string;
}

interface Version {
  id: string;
  version_number: string;
  version_name: string;
  release_date: string;
  description: string;
  features: Feature[];
  is_major: boolean;
}

interface UseVersionCheckResult {
  pendingVersion: Version | null;
  loading: boolean;
  error: string | null;
  markAsViewed: (versionId: string) => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export const useVersionCheck = (userId: string | null): UseVersionCheckResult => {
  const [pendingVersion, setPendingVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: versions, error: versionsError } = await supabase
        .from('system_versions')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: false });

      if (versionsError) {
        throw versionsError;
      }

      if (!versions || versions.length === 0) {
        setPendingVersion(null);
        setLoading(false);
        return;
      }

      const { data: viewedVersions, error: viewedError } = await supabase
        .from('user_version_views')
        .select('version_id, dismissed')
        .eq('user_id', userId);

      if (viewedError) {
        throw viewedError;
      }

      const viewedVersionIds = new Set(
        (viewedVersions || [])
          .filter(v => v.dismissed)
          .map(v => v.version_id)
      );

      const unviewedVersion = versions.find(
        version => !viewedVersionIds.has(version.id)
      );

      if (unviewedVersion) {
        setPendingVersion({
          id: unviewedVersion.id,
          version_number: unviewedVersion.version_number,
          version_name: unviewedVersion.version_name,
          release_date: unviewedVersion.release_date,
          description: unviewedVersion.description || '',
          features: Array.isArray(unviewedVersion.features)
            ? unviewedVersion.features
            : [],
          is_major: unviewedVersion.is_major || false,
        });
      } else {
        setPendingVersion(null);
      }
    } catch (err) {
      console.error('Error checking for version updates:', err);
      setError('Erro ao verificar atualizações do sistema');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsViewed = useCallback(async (versionId: string) => {
    if (!userId) return;

    try {
      const { data: existing, error: checkError } = await supabase
        .from('user_version_views')
        .select('id, dismissed')
        .eq('user_id', userId)
        .eq('version_id', versionId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('user_version_views')
          .update({
            dismissed: true,
            viewed_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('user_version_views')
          .insert({
            user_id: userId,
            version_id: versionId,
            dismissed: true,
            viewed_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      setPendingVersion(null);
    } catch (err) {
      console.error('Error marking version as viewed:', err);
      setError('Erro ao marcar versão como visualizada');
    }
  }, [userId]);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return {
    pendingVersion,
    loading,
    error,
    markAsViewed,
    checkForUpdates
  };
};
