/* eslint-disable security/detect-object-injection */
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';
import styles from './page.module.css';

export default function StudentDashboard() {
  const { session, loading: authLoading } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [allRegistrations, setAllRegistrations] = useState([]);

  // Store the Global Platform Goals
  const [globalGoals, setGlobalGoals] = useState({ full_time: 150, part_time: 100 });

  // Year Filter State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear().toString()]);

  useEffect(() => {
    if (!authLoading && session) {
      fetchDashboardData();
    } else if (!authLoading && !session) {
      setLoading(false);
    }
  }, [session, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Profile
      const { data: userData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(userData);

      // Fetch Global Platform Settings
      const { data: settingsData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
      if (settingsData) {
        setGlobalGoals({
          full_time: settingsData.full_time_hours || 150,
          part_time: settingsData.part_time_hours || 100
        });
      }

      // Fetch Registrations
      const { data: regData, error } = await supabase
        .from('registrations')
        .select(`status, expected_hours, events ( hours, start_date )`)
        .eq('student_id', session.user.id);

      if (error) throw error;
      setAllRegistrations(regData || []);

      // Extract unique years from the events
      const years = new Set();
      const currentYear = new Date().getFullYear().toString();
      years.add(currentYear);
      
      regData?.forEach(reg => {
        if (reg.events?.start_date) {
          years.add(new Date(reg.events.start_date).getFullYear().toString());
        }
      });
      
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(['All Time', ...sortedYears]);

    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className={styles.loadingContainer}>Loading your dashboard...</div>;

  // Dynamic Target Goal using the Admin's Database Settings
  const targetGoal = profile?.enrollment_status === 'part-time' ? globalGoals.part_time : globalGoals.full_time;

  // --- CALCULATE FILTERED TOTALS FOR METRICS & CHART ---
  let filterTotal = 0;
  let filterApproved = 0;
  let filterPending = 0;
  const monthsTracker = {};

  if (selectedYear !== 'All Time') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthNames.forEach((month, index) => {
      const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
      monthsTracker[monthKey] = { name: month, approved: 0, pending: 0, total: 0 };
    });
  }

  allRegistrations.forEach(reg => {
    if (!reg.events?.start_date) return;

    const date = new Date(reg.events.start_date);
    const eventYear = date.getFullYear().toString();

    if (selectedYear !== 'All Time' && eventYear !== selectedYear) return;

    const hrs = parseFloat(reg.expected_hours || reg.events?.hours || 0);

    // Only add to Total if it is NOT rejected
    if (reg.status !== 'rejected') {
      filterTotal += hrs;
    }

    if (reg.status === 'approved') filterApproved += hrs;
    if (reg.status === 'pending') filterPending += hrs;

   
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Explicit string formatting to guarantee "Jan '25" instead of relying on browser locale interpretations
    const rawMonthName = date.toLocaleString('default', { month: 'short' });
    const shortYear = date.getFullYear().toString().slice(-2);
    const monthName = selectedYear === 'All Time' ? `${rawMonthName} '${shortYear}` : rawMonthName;

    if (!monthsTracker[monthKey]) {
      monthsTracker[monthKey] = { name: monthName, approved: 0, pending: 0, total: 0 };
    }
    // ------------------------------------------

    // Chart ignores rejected hours
    if (reg.status === 'approved') monthsTracker[monthKey].approved += hrs;
    if (reg.status === 'pending') monthsTracker[monthKey].pending += hrs;
    if (reg.status !== 'rejected') monthsTracker[monthKey].total += hrs;
  });

  const progressPercentage = Math.min((filterApproved / targetGoal) * 100, 100);
  const pendingPercentage = Math.min((filterPending / targetGoal) * 100, 100 - progressPercentage);

  let sortedMonthlyStats = Object.keys(monthsTracker)
    .sort()
    .map(key => monthsTracker[key]);

  if (selectedYear === 'All Time') {
    sortedMonthlyStats = sortedMonthlyStats.filter(m => m.total > 0);
  }

  const maxMonthHours = sortedMonthlyStats.length > 0 
    ? Math.max(10, ...sortedMonthlyStats.map(m => m.approved + m.pending)) 
    : 10;

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋</h1>
        <p className={styles.subtitle}>Track your Give Back hours and yearly progress.</p>
      </header>

      {/* FILTER HEADER */}
      <div className={styles.filterContainer}>
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)}
          className={styles.yearSelect}
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year === 'All Time' ? 'All Time Overview' : `${year} Academic Year`}</option>
          ))}
        </select>
      </div>

      {/* OVERALL PROGRESS BAR */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <h2 className={styles.progressTitle}>Give Back Yearly Goal</h2>
          <span className={styles.progressGoal}>{profile?.enrollment_status === 'part-time' ? 'Part-Time' : 'Full-Time'} Target: {targetGoal} Hours</span>
        </div>
        
        <div className={styles.progressBarContainer}>
          <div 
            style={{ width: `${progressPercentage}%` }} 
            className={styles.progressApproved}
          >
            {progressPercentage > 5 ? `${progressPercentage.toFixed(0)}%` : ''}
          </div>
          <div 
            style={{ width: `${pendingPercentage}%` }} 
            className={styles.progressPending}
            title={`${filterPending.toFixed(1)} Pending Hours`}
          />
        </div>
        
        <div className={styles.progressLabels}>
          <span>{filterApproved.toFixed(1)} Approved ({selectedYear})</span>
          <span>{targetGoal} Required</span>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Total Logged</div>
          <div className={`${styles.metricValue} ${styles.metricValueTotal}`}>{filterTotal.toFixed(1)}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Approved</div>
          <div className={`${styles.metricValue} ${styles.metricValueApproved}`}>{filterApproved.toFixed(1)}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Pending</div>
          <div className={`${styles.metricValue} ${styles.metricValuePending}`}>{filterPending.toFixed(1)}</div>
        </div>
      </div>

      {/* VERTICAL BAR CHART */}
      <div className={styles.analyticsSection}>
        <h2 className={styles.analyticsTitle}>Monthly Hours Breakdown</h2>
        
        <div className={styles.chartContainer}>
          <div className={styles.chartLegend}>
            <span className={styles.legendItem}><div className={styles.legendBoxApproved} /> Approved</span>
            <span className={styles.legendItem}><div className={styles.legendBoxPending} /> Pending</span>
          </div>

          {sortedMonthlyStats.length === 0 ? (
            <div className={styles.emptyChart}>No hours logged for {selectedYear}.</div>
          ) : (
            <div>
              <div className={styles.barChart}>
                {sortedMonthlyStats.map((month, index) => {
                  const approvedHeight = (month.approved / maxMonthHours) * 100;
                  const pendingHeight = (month.pending / maxMonthHours) * 100;
                  const total = month.approved + month.pending;

                  return (
                    <div key={index} className={styles.barColumn}>
                      {total > 0 && <div className={styles.barValue}>{total.toFixed(0)}</div>}
                      <div className={styles.barWrapper}>
                        <div 
                          style={{ height: `${pendingHeight}%` }} 
                          className={styles.barPending} 
                          title={`${month.pending} Pending Hours`}
                        />
                        <div 
                          style={{ height: `${approvedHeight}%` }} 
                          className={`${styles.barApproved} ${month.pending === 0 ? styles.barApprovedOnly : ''}`} 
                          title={`${month.approved} Approved Hours`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.chartXAxis}>
                {sortedMonthlyStats.map((month, index) => (
                  <div key={index} className={styles.chartXAxisItem}>
                    <div className={styles.monthLabel}>{month.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}