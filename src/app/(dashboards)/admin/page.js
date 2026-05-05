"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useAsync } from '../../../hooks/useAsync';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';
import styles from './page.module.css';

export default function AdminDashboard() {
  const { session, loading: authLoading } = useSupabaseSession();
  const { loading, execute } = useAsync();
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalEntities: 0,
    totalActiveEvents: 0,
    totalApprovedHours: 0,
    pendingSubmissions: 0   
  });

  useEffect(() => {
    if (!authLoading && session) {
      execute(async () => {
        const today = new Date().toISOString().split('T')[0];

        const [
          { count: studentCount },
          { count: entityCount },
          { count: eventCount },
          { count: pendingSubCount },
          { data: registrations }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
          supabase.from('entities').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
          // Active events that haven't ended yet
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('end_date', today),
          // Pending hour submissions
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('registrations').select('expected_hours, events ( hours )').eq('status', 'approved'),
        ]);

        const totalHours = (registrations || []).reduce((sum, reg) =>
          sum + parseFloat(reg.expected_hours || reg.events?.hours || 0), 0);

        setMetrics({
          totalStudents: studentCount || 0,
          totalEntities: entityCount || 0,
          totalActiveEvents: eventCount || 0,
          totalApprovedHours: totalHours,
          pendingSubmissions: pendingSubCount || 0
        });
      });
    }
  }, [authLoading, session]);

  if (authLoading || loading) return <div className={styles.loadingState}>Loading System Diagnostics...</div>;

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>System Overview</h1>
        <p className={styles.subtitle}>Global metrics and platform health.</p>
      </header>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Total Approved Hours</div>
          <div className={`${styles.metricValue} ${styles.metricValueSuccess}`}>{metrics.totalApprovedHours.toFixed(1)}</div>
          <div className={styles.metricSubtitle}>Platform-wide impact</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Active Students</div>
          <div className={styles.metricValue}>{metrics.totalStudents}</div>
          <div className={styles.metricSubtitle}>Registered & Approved</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Partner Entities</div>
          <div className={styles.metricValue}>{metrics.totalEntities}</div>
          <div className={styles.metricSubtitle}>Active Organizations</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Active Events</div>
          <div className={styles.metricValue}>{metrics.totalActiveEvents}</div>
          <div className={styles.metricSubtitle}>Currently recruiting volunteers</div>
        </div>
        <div className={`${styles.metricCard} ${metrics.pendingSubmissions > 0 ? styles.highlightCard : ''}`}>
          <div className={styles.metricTitle}>Pending Hours</div>
          <div className={`${styles.metricValue} ${metrics.pendingSubmissions > 0 ? styles.highlightValue : ''}`}>{metrics.pendingSubmissions}</div>
          <div className={styles.metricSubtitle}>Submissions awaiting review</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Administration Modules</h2>
        <div className={styles.actionGrid}>
          <Link href="/admin/users" className={styles.actionCard}>
            <div className={styles.actionIcon}>👥</div>
            <div className={styles.actionText}><h3>User Management</h3><p>Approve pending accounts, view profiles, and manage access.</p></div>
          </Link>
          <Link href="/admin/events" className={styles.actionCard}>
            <div className={styles.actionIcon}>📅</div>
            <div className={styles.actionText}><h3>Event Moderation</h3><p>Review active events, force-cancel, or delete invalid records.</p></div>
          </Link>
          <Link href="/admin/hours" className={styles.actionCard}>
            <div className={styles.actionIcon}>⏱️</div>
            <div className={styles.actionText}><h3>Hours Moderation</h3><p>Audit student submissions and override organization approvals.</p></div>
          </Link>
          <Link href="/admin/settings" className={styles.actionCard}>
            <div className={styles.actionIcon}>⚙️</div>
            <div className={styles.actionText}><h3>Platform Settings</h3><p>Manage global graduation requirements and system rules.</p></div>
          </Link>
        </div>
      </div>
    </div>
  );
}