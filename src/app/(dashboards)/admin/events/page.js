'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { useDebounce } from '../../../../hooks/useDebounce';
import { usePagination } from '../../../../hooks/usePagination';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import EventStatusBadge from '../../../../components/EventStatusBadge';

import styles from './page.module.css';
import commonStyles from '../../../styles/common.module.css';

const ITEMS_PER_PAGE = 10;

export default function EventModerationPage() {
  const { session, loading: authLoading } = useSupabaseSession();

  const [activeTab, setActiveTab] = useState('active');
  const [counts, setCounts] = useState({ active: 0, past: 0, cancelled: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [showVolunteers, setShowVolunteers] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { currentPage, from, to, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, pageInfo, reset } = usePagination(ITEMS_PER_PAGE);
  const modalRef = useFocusTrap(!!selectedEventForModal, () => setSelectedEventForModal(null));

  const fetchCounts = useCallback(async () => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    const [{ count: active }, { count: past }, { count: cancelled }] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'cancelled').gte('end_date', today),
      supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'cancelled').lt('end_date', today),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ]);
    setCounts({ active: active || 0, past: past || 0, cancelled: cancelled || 0 });
  }, [session]);

  const fetchEvents = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      let query = supabase.from('events').select('*, entities ( organization_name )', { count: 'exact' });
      if (activeTab === 'active') query = query.neq('status', 'cancelled').gte('end_date', today);
      else if (activeTab === 'past') query = query.neq('status', 'cancelled').lt('end_date', today);
      else if (activeTab === 'cancelled') query = query.eq('status', 'cancelled');
      if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);

      const { data, count, error } = await query.order('start_date', { ascending: false }).range(from, to);
      if (error) throw error;
      setEvents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, from, to, setTotalCount, session]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchEvents();
      fetchCounts();
    } else if (!session && !authLoading) {
      setLoading(false);
    }
  }, [fetchEvents, fetchCounts, session, authLoading]);

  useEffect(() => { reset(); }, [debouncedSearch, activeTab, reset]);

  const handleForceCancel = async (event) => {
    if (!window.confirm(`WARNING: Force cancel "${event.title}"?\n\nThis will notify all registered students.`)) return;
    setProcessingId(event.id);
    try {
      await supabase.from('events').update({ status: 'cancelled' }).eq('id', event.id);
      const { data: regs } = await supabase.from('registrations').select('student_id').eq('event_id', event.id);
      if (regs?.length > 0) {
        await supabase.from('notifications').insert(regs.map(r => ({
          user_id: r.student_id,
          title: "System Alert: Event Cancelled",
          message: `The event "${event.title}" has been cancelled by Platform Administration.`
        })));
      }
      await supabase.from('registrations').update({ status: 'cancelled' }).eq('event_id', event.id);
      alert("Event forcefully cancelled and students notified.");
      await fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to cancel the event.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleHardDelete = async (eventId, eventTitle) => {
    if (!window.confirm(`CRITICAL: Permanently delete "${eventTitle}"? This cannot be undone.`)) return;
    setProcessingId(eventId);
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      alert("Event permanently deleted.");
      if (events.length === 1 && canGoPrev) prevPage();
      else await fetchEvents();
    } catch (error) {
      console.error(error);
      alert("Failed to delete event.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRowClick = async (event) => {
    setSelectedEventForModal(event);
    setShowVolunteers(false);
    setLoadingModal(true);
    try {
      const { data, error } = await supabase.from('registrations')
        .select('*, profiles:student_id ( full_name, student_id )').eq('event_id', event.id);
      if (error) throw error;
      setRegistrations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModal(false);
    }
  };

  if (authLoading || (loading && events.length === 0 && !searchQuery)) {
    return <div className={commonStyles.loadingState}>Loading event database...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Event Moderation</h1>
        <p className={styles.subtitle}>Oversee all platform events, force cancellations, or purge invalid records.</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          {[['active', counts.active], ['past', counts.past], ['cancelled', counts.cancelled]].map(([tab, count]) => (
            <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => { setActiveTab(tab); reset(); }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          ))}
        </div>
        <div className={styles.searchBox}>
          <input type="text" placeholder="Search by event or organization..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className={commonStyles.searchInput} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={commonStyles.adminTable}>
          <thead>
            <tr>
              <th>Event Title</th><th>Organization</th><th>Dates</th><th>Hours/Day</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr><td colSpan="6" className={commonStyles.loadingState}>Loading event database...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan="6" className={commonStyles.emptyState}>No events match your current filters.</td></tr>
            ) : events.map(event => (
              <tr key={event.id} className={styles.clickableRow} onClick={() => handleRowClick(event)}>
                <td data-label="Event Title" className={commonStyles.primaryTextName}>{event.title}</td>
                <td data-label="Organization">{event.entities?.organization_name || 'Unknown'}</td>
                <td data-label="Dates">
                  <div className={styles.eventDate}>{event.start_date}</div>
                  {event.start_date !== event.end_date && <div className={commonStyles.secondaryText}>to {event.end_date}</div>}
                </td>
                <td data-label="Hours">{event.hours} hrs</td>
                <td data-label="Status"><EventStatusBadge status={event.status} startDate={event.start_date} endDate={event.end_date} /></td>
                <td data-label="Actions">
                  <div className={styles.actionGroup} onClick={(e) => e.stopPropagation()}>
                    {event.status === 'active' && (
                      <button onClick={() => handleForceCancel(event)} disabled={processingId === event.id}
                        className={`${commonStyles.btn} ${commonStyles.forceCancelBtn}`}>⚠️ Force Cancel</button>
                    )}
                    <button onClick={() => handleHardDelete(event.id, event.title)} disabled={processingId === event.id}
                      className={`${commonStyles.btn} ${commonStyles.deleteBtn}`}>🗑️ Delete</button>
                  </div>
                </td>
              </tr>
            ))}
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

      {selectedEventForModal && (
        <div className={commonStyles.modalOverlay} onClick={() => setSelectedEventForModal(null)}>
          <div className={commonStyles.modalContent} ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <div className={commonStyles.modalHeader}>
              <h2 className={styles.modalTitle}>Event Information</h2>
              <button className={styles.closeButton} onClick={() => setSelectedEventForModal(null)}>&times;</button>
            </div>
            <div className={commonStyles.modalBody}>
              <div className={styles.eventDetailsGrid}>
                <div className={styles.detailRowFull}>
                  <span className={styles.detailLabel}>Title</span>
                  <span className={styles.detailValue}><strong>{selectedEventForModal.title}</strong></span>
                </div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Organization</span><span className={styles.detailValue}>{selectedEventForModal.entities?.organization_name || 'N/A'}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Dates</span><span className={styles.detailValue}>{selectedEventForModal.start_date}{selectedEventForModal.start_date !== selectedEventForModal.end_date && ` to ${selectedEventForModal.end_date}`}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Hours Awarded</span><span className={styles.detailValue}>{selectedEventForModal.hours} hrs / day</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>Capacity</span><span className={styles.detailValue}>{selectedEventForModal.required_volunteers ? `${selectedEventForModal.required_volunteers} volunteers max` : 'Unlimited'}</span></div>
                <div className={styles.detailRowFull}>
                  <span className={styles.detailLabel}>Description</span>
                  <span className={`${styles.detailValue} ${styles.descValue}`}>{selectedEventForModal.description || 'No description provided.'}</span>
                </div>
              </div>

              <button className={styles.toggleVolunteersBtn} onClick={() => setShowVolunteers(!showVolunteers)}>
                {showVolunteers ? 'Hide Volunteers' : `View Registered Volunteers (${registrations.length})`}
              </button>

              {showVolunteers && (
                loadingModal ? <div className={commonStyles.loadingState}>Loading registrations...</div>
                : registrations.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={commonStyles.adminTable}>
                      <thead><tr><th>Student Name</th><th>Student ID</th></tr></thead>
                      <tbody>
                        {registrations.map(reg => (
                          <tr key={reg.id}>
                            <td>{reg.profiles?.full_name || 'Unknown'}</td>
                            <td>{reg.profiles?.student_id || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className={commonStyles.emptyState}>No students have registered for this event yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}