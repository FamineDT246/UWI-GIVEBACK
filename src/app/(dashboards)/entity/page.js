"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';
import styles from './page.module.css';

export default function EntityCommandCenter() {
  const { session, loading: authLoading } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    totalVolunteers: 0,
    approvedHours: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardMetrics();
    }
  }, [session, authLoading]);

  const fetchDashboardMetrics = async () => {
    try {
      if (!session) return;

      const entityId = session.user.id;

      // 1. Fetch Organization Name
      const { data: entityData } = await supabase
        .from('entities')
        .select('organization_name')
        .eq('id', entityId)
        .single();
      
      setProfile(entityData);

      // 2. Fetch Total Events Created
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', entityId);

      // 3. Fetch all registrations tied to this entity's events
      const { data: registrations } = await supabase
        .from('registrations')
        .select('status, expected_hours, events!inner(entity_id, hours)')
        .eq('events.entity_id', entityId);

      let totalVolunteers = registrations?.length || 0;
      let totalApprovedHours = 0;
      let pendingCount = 0;

      if (registrations) {
        registrations.forEach(reg => {
          if (reg.status === 'pending') pendingCount += 1;
          if (reg.status === 'approved') {
            totalApprovedHours += parseFloat(reg.expected_hours || reg.events?.hours || 0);
          }
        });
      }

      setMetrics({
        totalEvents: eventsCount || 0,
        totalVolunteers,
        approvedHours: totalApprovedHours,
        pendingApprovals: pendingCount
      });

    } catch (error) {
      console.error("Error fetching entity metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className={styles.loadingState}>Loading Command Center...</div>;

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome, {profile?.organization_name || 'Organization'}!</h1>
        <p className={styles.subtitle}>Here is a summary of your impact on the Give Back program.</p>
      </header>

      {/* METRICS GRID */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Total Impact Hours</div>
          <div className={`${styles.metricValue} ${styles.metricValueSuccess}`}>
            {metrics.approvedHours.toFixed(1)}
          </div>
          <div className={styles.metricSubtitle}>Approved volunteer hours</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Total Volunteers</div>
          <div className={styles.metricValue}>{metrics.totalVolunteers}</div>
          <div className={styles.metricSubtitle}>Sign-ups across all events</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Events Hosted</div>
          <div className={styles.metricValue}>{metrics.totalEvents}</div>
          <div className={styles.metricSubtitle}>Active and past opportunities</div>
        </div>

        <div className={`${styles.metricCard} ${metrics.pendingApprovals > 0 ? styles.highlightCard : ''}`}>
          <div className={styles.metricTitle}>Pending Approvals</div>
          <div className={`${styles.metricValue} ${metrics.pendingApprovals > 0 ? styles.highlightValue : ''}`}>
            {metrics.pendingApprovals}
          </div>
          <div className={styles.metricSubtitle}>Students awaiting verification</div>
        </div>
      </div>

      {/* QUICK ACTIONS ROUTING */}
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link href="/entity/events" className={styles.actionCard}>
            <div className={styles.actionIcon}>📅</div>
            <div className={styles.actionText}>
              <h3>Manage Events</h3>
              <p>Create new volunteer opportunities, view rosters, and cancel events.</p>
            </div>
          </Link>
          
          <Link href="/entity/approvals" className={styles.actionCard}>
            <div className={styles.actionIcon}>✅</div>
            <div className={styles.actionText}>
              <h3>Verify Hours</h3>
              <p>Review student evidence, approve hours, or request corrections.</p>
            </div>
          </Link>

          <Link href="/entity/settings" className={styles.actionCard}>
            <div className={styles.actionIcon}>🏢</div>
            <div className={styles.actionText}>
              <h3>Organization Profile</h3>
              <p>Update your contact information, logo, and public details.</p>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}