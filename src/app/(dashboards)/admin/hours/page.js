"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { useDebounce } from '../../../../hooks/useDebounce';
import { usePagination } from '../../../../hooks/usePagination';
import { sanitizeUrl } from '../../../../utils/sanitizeUrl';

import styles from './page.module.css';
import commonStyles from '../../../styles/common.module.css';

const ITEMS_PER_PAGE = 10;

export default function AdminHoursPage() {
  const { session, loading: authLoading } = useSupabaseSession();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { currentPage, from, to, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, pageInfo, reset, handleLastItemOnPage } = usePagination(ITEMS_PER_PAGE);

  const fetchSubmissions = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
      if (profile) setIsAdmin(profile.is_admin);

      let query = supabase.from('admin_hours_view').select('*', { count: 'exact' }).eq('status', activeTab);
      if (debouncedSearch) query = query.or(`student_name.ilike.%${debouncedSearch}%,event_title.ilike.%${debouncedSearch}%,organization_name.ilike.%${debouncedSearch}%`);

      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      setSubmissions((data || []).map(sub => ({
        ...sub,
        profiles: { full_name: sub.student_name, student_id: sub.student_uwi_id },
        events: { title: sub.event_title, hours: sub.event_hours, end_date: sub.event_end_date, entities: { organization_name: sub.organization_name } }
      })));
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      alert("Failed to load hours database.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, from, to, setTotalCount, session]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchSubmissions();
    } else if (!session && !authLoading) {
      setLoading(false);
    }
  }, [fetchSubmissions, session, authLoading]);

  useEffect(() => { reset(); }, [debouncedSearch, activeTab, reset]);

  const handleOverride = async (subId, newStatus, isForceAction = false) => {
    if (!session) return;
    const targetSub = submissions.find(s => s.id === subId);
    if (newStatus === 'approved' && targetSub) {
      const eventEndDate = new Date(targetSub.events?.end_date);
      eventEndDate.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (eventEndDate > today) return alert("You cannot approve hours until the event has officially ended.");
    }

    const actionName = isForceAction ? `FORCE ${newStatus.toUpperCase()}` : newStatus.toUpperCase();
    if (!window.confirm(`Are you sure you want to ${actionName} these hours?`)) return;

    setProcessingId(subId);
    try {
      const feedbackMsg = isForceAction
        ? `[Admin Override]: System Administrator forced status to ${newStatus.toUpperCase()}.`
        : `[Staff Review]: Hours ${newStatus.toUpperCase()} by university staff.`;

      const { error } = await supabase.from('registrations').update({ status: newStatus, feedback: feedbackMsg }).eq('id', subId);
      if (error) throw error;
      
      if (typeof handleLastItemOnPage === 'function') {
         handleLastItemOnPage(fetchSubmissions);
      } else {
         await fetchSubmissions();
      }
      
    } catch (error) {
      console.error(error);
      alert("Failed to update submission.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (subId) => {
    if (!session) return;
    if (!window.confirm("CRITICAL: Permanently DELETE this submission?")) return;
    setProcessingId(subId);
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', subId);
      if (error) throw error;
      
      if (typeof handleLastItemOnPage === 'function') {
         handleLastItemOnPage(fetchSubmissions);
      } else {
         await fetchSubmissions();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (authLoading || (loading && submissions.length === 0 && !searchQuery)) {
    return <div className={commonStyles.loadingState}>Loading all platform submissions...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hours Moderation</h1>
        <p className={styles.subtitle}>{isAdmin ? 'Administrator Access: Override and audit all platform hours.' : 'Staff Access: Review and approve completed events with valid evidence.'}</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          {['pending', 'approved', 'rejected'].map(tab => (
            <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => { setActiveTab(tab); reset(); }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <input type="text" placeholder="Search by student, event, or org..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className={commonStyles.searchInput} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={commonStyles.adminTable}>
          <thead>
            <tr><th>Student</th><th>Event & Org</th><th>Hours Request</th><th>Evidence</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {loading && submissions.length === 0 ? (
              <tr><td colSpan="6" className={commonStyles.loadingState}>Loading all platform submissions...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan="6" className={commonStyles.emptyState}>No submissions found.</td></tr>
            ) : submissions.map(sub => {
              const hasEvidence = !!sub.evidence_url;
              const eventEndDate = new Date(sub.events?.end_date); eventEndDate.setHours(0, 0, 0, 0);
              const isEventFinished = eventEndDate <= today;
              const canStaffApprove = hasEvidence && isEventFinished;
              const lockReason = !isEventFinished ? "Event has not ended yet." : !hasEvidence ? "Awaiting student evidence upload." : "";

              return (
                <tr key={sub.id}>
                  <td data-label="Student">
                    <div className={commonStyles.primaryTextName}>{sub.profiles?.full_name || 'Unknown'}</div>
                    <div className={commonStyles.secondaryText}>{sub.profiles?.student_id || 'No ID'}</div>
                  </td>
                  <td data-label="Event">
                    <div className={commonStyles.primaryTextName}>{sub.events?.title || 'Unknown Event'}</div>
                    <div className={commonStyles.secondaryText}>🏢 {sub.events?.entities?.organization_name || 'Unknown'}</div>
                  </td>
                  <td data-label="Hours"><strong className={commonStyles.highlightText}>{sub.expected_hours || sub.events?.hours || 0} hrs</strong></td>
                  <td data-label="Evidence">
                    {hasEvidence
                      ? <a href={sanitizeUrl(sub.evidence_url)} target="_blank" rel="noopener noreferrer" className={commonStyles.evidenceLink}>📄 View File</a>
                      : <span className={commonStyles.noEvidence}>No Evidence</span>}
                  </td>
                  <td data-label="Status"><span className={`${commonStyles.statusBadge} ${commonStyles[`status-${sub.status}`]}`}>{sub.status}</span></td>
                  <td data-label="Action">
                    <div className={styles.actionGroup}>
                      {sub.status !== 'approved' && (
                        isAdmin
                          ? <button onClick={() => handleOverride(sub.id, 'approved', true)} disabled={processingId === sub.id} className={`${commonStyles.btn} ${styles.forceApproveBtn || commonStyles.approveBtn}`}>⚡ Force Approve</button>
                          : <button onClick={() => handleOverride(sub.id, 'approved', false)} disabled={processingId === sub.id || !canStaffApprove} className={`${commonStyles.btn} ${commonStyles.approveBtn}`} title={!canStaffApprove ? lockReason : "Approve Hours"}>✓ Approve</button>
                      )}
                      {sub.status !== 'rejected' && (
                        <button onClick={() => handleOverride(sub.id, 'rejected', isAdmin)} disabled={processingId === sub.id} className={`${commonStyles.btn} ${commonStyles.rejectBtn}`}>✗ Reject</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(sub.id)} disabled={processingId === sub.id} className={`${commonStyles.btn} ${commonStyles.deleteBtn}`}>🗑️ Purge</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={commonStyles.paginationContainer}>
        <div className={commonStyles.pageInfo}>{pageInfo}</div>
        <div className={commonStyles.paginationControls}>
          <button className={commonStyles.pageBtn} disabled={!canGoPrev || loading} onClick={prevPage}>Previous</button>
          <button className={commonStyles.pageBtn} disabled={!canGoNext || loading} onClick={nextPage}>Next</button>
        </div>
      </div>
    </div>
  );
}