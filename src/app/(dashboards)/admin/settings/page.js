"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAsync } from '../../../../hooks/useAsync';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import styles from './page.module.css';

export default function PlatformSettingsPage() {
  const { session, loading: authLoading } = useSupabaseSession();
  const { loading: fetching, execute: fetchExecute } = useAsync();
  const { loading: saving, execute: saveExecute } = useAsync();
  const [settings, setSettings] = useState({ full_time_hours: 150, part_time_hours: 100 });

  const fetchSettings = useCallback(async () => {
    if (!session) return;
    fetchExecute(async () => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) setSettings(data);
    });
  }, [session, fetchExecute]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchSettings();
    }
  }, [fetchSettings, session, authLoading]);

  const handleInputChange = (e) => {
    setSettings({ ...settings, [e.target.name]: parseInt(e.target.value) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    try {
      await saveExecute(async () => {
        const { error } = await supabase.from('system_settings')
          .update({ full_time_hours: settings.full_time_hours, part_time_hours: settings.part_time_hours, updated_at: new Date().toISOString() })
          .eq('id', 1);
        if (error) throw error;
        alert("Platform settings updated successfully! All student dashboards will now reflect these new goals.");
      });
    } catch {
      alert("Failed to update system settings.");
    }
  };

  if (authLoading || fetching) return <div className={styles.loadingState}>Loading system settings...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Platform Policies</h1>
        <p className={styles.subtitle}>Manage the global rules and requirements for the Give Back program.</p>

        <form onSubmit={handleSave}>
          <div className={styles.policyBox}>
            <h3 className={styles.sectionTitle}>🎓 Graduation Requirements</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full-Time Student Goal (Hours)</label>
              <input required type="number" name="full_time_hours" value={settings.full_time_hours} onChange={handleInputChange} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Part-Time Student Goal (Hours)</label>
              <input required type="number" name="part_time_hours" value={settings.part_time_hours} onChange={handleInputChange} className={styles.input} />
            </div>
          </div>
          <button type="submit" disabled={saving} className={styles.saveBtn}>
            {saving ? 'Saving System Policies...' : 'Save Global Policies'}
          </button>
        </form>
      </div>
    </div>
  );
}