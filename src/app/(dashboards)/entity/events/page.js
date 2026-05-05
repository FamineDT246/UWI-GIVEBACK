"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { useDebounce } from '../../../../hooks/useDebounce';
import { usePagination } from '../../../../hooks/usePagination';
import { useEventForm } from '../../../../hooks/useEventForm';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import styles from './page.module.css';
import EventStatusBadge from '../../../../components/EventStatusBadge';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ITEMS_PER_PAGE = 8;

export default function EntityDashboard() {
  const { session, loading: authLoading } = useSupabaseSession();
  
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState('active');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  const { currentPage, from, to, totalCount, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, pageInfo, reset: resetPagination } = usePagination(ITEMS_PER_PAGE);
  const { formData, handleInputChange, toggleRecurringDay, resetForm, isMultiDay } = useEventForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const [removalModal, setRemovalModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const todayString = new Date().toISOString().split('T')[0];

  const eventModalRef = useFocusTrap(isModalOpen, () => setIsModalOpen(false));
  const removalModalRef = useFocusTrap(removalModal, () => {
    setRemovalModal(false);
    setSelectedVolunteer(null);
    setRemovalReason('');
  });

  useEffect(() => {
    resetPagination();
  }, [debouncedSearch, dashboardTab, resetPagination]);

  const fetchDashboardData = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);

      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('entity_id', session.user.id);

      if (dashboardTab === 'active') {
        query = query.neq('status', 'cancelled');
      } else {
        query = query.eq('status', 'cancelled');
      }

      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`);
      }

      const { data: eventsData, count, error } = await query
        .order('start_date', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setMyEvents(eventsData || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }, [session, dashboardTab, debouncedSearch, from, to, setTotalCount]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const openCreateModal = () => {
    setSelectedEvent(null);
    resetForm();
    setActiveTab('details');
    setIsModalOpen(true);
  };

  const openEditModal = async (event) => {
    setSelectedEvent(event);
    resetForm({
      title: event.title || '', description: event.description || '',
      start_date: event.start_date || '', start_time: event.start_time || '',
      end_date: event.end_date || '', end_time: event.end_time || '',
      hours: event.hours || '', required_volunteers: event.required_volunteers || '',
      image_url: event.image_url || '', recurrence_pattern: event.recurrence_pattern || ''
    });
    setActiveTab('details');
    setIsModalOpen(true);
    await fetchVolunteers(event.id);
  };

  const fetchVolunteers = async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`id, status, created_at, student_id, profiles ( full_name, email, phone_number, student_id )`)
        .eq('event_id', eventId);
      if (error) throw error;
      setVolunteers(data || []);
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();

    if (formData.start_date === formData.end_date) {
      if (formData.start_time >= formData.end_time) {
        return alert("For a single-day event, the End Time must be after the Start Time.");
      }
    }

    if (isMultiDay && (!formData.recurrence_pattern || formData.recurrence_pattern.length === 0)) {
      return alert("This is a multi-day event. Please select at least one day of the week it will occur on.");
    }

    setIsSubmitting(true);

    try {
      const payload = {
        entity_id: session.user.id,
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_date: formData.end_date,
        end_time: formData.end_time,
        hours: formData.hours ? parseFloat(formData.hours) : null,
        required_volunteers: formData.required_volunteers ? parseInt(formData.required_volunteers) : null,
        image_url: formData.image_url,
        is_recurring: isMultiDay,
        recurrence_pattern: isMultiDay ? formData.recurrence_pattern : null
      };

      let error;
      if (selectedEvent) {
        const { error: updateError } = await supabase.from('events').update(payload).eq('id', selectedEvent.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('events').insert(payload);
        error = insertError;
      }

      if (error) throw error;
      alert(`Event ${selectedEvent ? 'updated' : 'created'} successfully!`);
      setIsModalOpen(false);
      await fetchDashboardData();

    } catch (error) {
      console.error("Error saving event:", error);
      alert(`Failed to ${selectedEvent ? 'update' : 'create'} event.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;

    const confirmCancel = window.confirm("Are you sure you want to cancel this event? This will notify all registered volunteers.");
    if (!confirmCancel) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', selectedEvent.id);
      if (updateError) throw updateError;

      const { data: registrations } = await supabase.from('registrations').select('student_id').eq('event_id', selectedEvent.id);

      if (registrations && registrations.length > 0) {
        const notificationsToInsert = registrations.map(reg => ({
          user_id: reg.student_id,
          title: "Event Cancelled",
          message: `The event "${selectedEvent.title}" scheduled for ${selectedEvent.start_date} has been cancelled by the organization.`
        }));
        await supabase.from('notifications').insert(notificationsToInsert);
      }

      await supabase.from('registrations').update({ status: 'cancelled' }).eq('event_id', selectedEvent.id);

      alert("Event cancelled, volunteers notified, and registrations cleared.");
      setIsModalOpen(false);
      await fetchDashboardData();
    } catch (error) {
      console.error("Error cancelling event:", error);
      alert("Failed to cancel event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    const confirmDelete = window.confirm("Are you absolutely sure you want to PERMANENTLY DELETE this event? This action cannot be undone.");
    if (!confirmDelete) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', selectedEvent.id);
      if (error) throw error;

      alert("Event permanently deleted from the database.");
      setIsModalOpen(false);
      
      if (myEvents.length === 1 && currentPage > 1) {
        prevPage();
      } else {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() || volunteers.length === 0) return;
    setIsBroadcasting(true);

    try {
      const notificationsToInsert = volunteers.map(vol => ({
        user_id: vol.student_id,
        title: `Announcement: ${selectedEvent.title}`,
        message: broadcastMsg
      }));

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;

      alert("Announcement sent to all registered volunteers!");
      setBroadcastMsg('');
    } catch (error) {
      console.error("Broadcast error:", error);
      alert("Failed to send announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleRemoveVolunteer = async () => {
    if (!removalReason.trim()) return alert('Please provide a reason for removal.');
    setIsRemoving(true);

    try {
      const { error: deleteError } = await supabase
        .from('registrations')
        .update({ status: 'removed' })
        .eq('id', selectedVolunteer.id);
      if (deleteError) throw deleteError;

      await supabase.from('notifications').insert({
        user_id: selectedVolunteer.student_id,
        title: `Removed from Event: ${selectedEvent.title}`,
        message: `You have been removed from "${selectedEvent.title}" by the organizing body. Reason: ${removalReason}`
      });

      await supabase.from('volunteer_removals').insert({
        entity_id: session.user.id,
        student_id: selectedVolunteer.student_id,
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        student_name: selectedVolunteer.profiles?.full_name || 'Unknown',
        reason: removalReason
      });

      setVolunteers(prev => prev.filter(v => v.id !== selectedVolunteer.id));
      setRemovalModal(false);
      setSelectedVolunteer(null);
      setRemovalReason('');
      alert('Volunteer removed and notified.');
    } catch (error) {
      console.error('Error removing volunteer:', error);
      alert('Failed to remove volunteer.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleExportCSV = () => {
    if (volunteers.length === 0) return;

    const headers = ["Student Name", "Student ID", "Email", "Phone", "Status", "Sign-in Signature"];
    const csvRows = [headers.join(',')];

    volunteers.forEach(vol => {
      const row = [
        `"${vol.profiles?.full_name || 'Unknown'}"`,
        `"${vol.profiles?.student_id || 'N/A'}"`,
        `"${vol.profiles?.email || 'N/A'}"`,
        `"${vol.profiles?.phone_number || 'N/A'}"`,
        `"${vol.status}"`,
        `""`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedEvent.title.replace(/\s+/g, '_')}_Roster.csv`);
    a.click();
  };

  const handleTabChange = (tab) => {
    setDashboardTab(tab);
    resetPagination();
    setSearchQuery('');
  };

  if (authLoading || (loading && myEvents.length === 0 && !searchQuery)) {
    return <div className={styles.loadingState}>Loading Entity Portal...</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <div className={styles.headerControls}>
          <div className={styles.dashboardTabs}>
            <button className={dashboardTab === 'active' ? styles.activeDashTab : styles.dashTab} onClick={() => handleTabChange('active')}>Active Events</button>
            <button className={dashboardTab === 'cancelled' ? styles.activeDashTab : styles.dashTab} onClick={() => handleTabChange('cancelled')}>Cancelled Events</button>
          </div>
          
          <div className={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search your events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.dashboardSearchInput}
            />
          </div>
        </div>

        <button onClick={openCreateModal} className={styles.createBtn}>+ Create New Event</button>
      </header>

      {loading && myEvents.length === 0 ? (
         <div className={styles.loadingState}>Loading events...</div>
      ) : (
        <>
          <div className={styles.eventsGrid}>
            {myEvents.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>No {dashboardTab === 'active' ? 'Active' : 'Cancelled'} Events</h2>
                <p>{dashboardTab === 'active' ? "You haven't posted any volunteer opportunities matching this search." : "You don't have any cancelled events matching this search."}</p>
              </div>
            ) : (
              myEvents.map(event => (
                <div key={event.id} className={styles.eventCard} onClick={() => openEditModal(event)}>
                  <div style={{ marginBottom: '10px' }}>
                    <EventStatusBadge status={event.status} startDate={event.start_date} endDate={event.end_date} />
                  </div>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <div className={styles.eventMeta}>📅 {event.start_date} {event.start_time && `at ${event.start_time}`}</div>
                  <div className={styles.eventMeta}>⏱️ {event.hours} Hours Credit</div>
                  <div className={styles.eventMeta}>👥 Needed: {event.required_volunteers || 'Unlimited'}</div>
                  {event.is_recurring && (
                    <div className={styles.recurrencePill}>🔄 Every {event.recurrence_pattern}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {totalCount > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.pageInfo}>
                {pageInfo}
              </div>
              <div className={styles.paginationControls}>
                <button 
                  className={styles.pageBtn} 
                  disabled={!canGoPrev || loading}
                  onClick={prevPage}
                >
                  Previous
                </button>
                <button 
                  className={styles.pageBtn} 
                  disabled={!canGoNext || loading}
                  onClick={nextPage}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} ref={eventModalRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2>{selectedEvent ? 'Manage Event' : 'Create New Event'}</h2>
                {selectedEvent && <EventStatusBadge status={selectedEvent.status} startDate={selectedEvent.start_date} endDate={selectedEvent.end_date} />}
              </div>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              {selectedEvent && (
                <div className={styles.tabs}>
                  <button className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`} onClick={() => setActiveTab('details')}>Event Details</button>
                  <button className={`${styles.tab} ${activeTab === 'volunteers' ? styles.activeTab : ''}`} onClick={() => setActiveTab('volunteers')}>Registered Volunteers</button>
                </div>
              )}

              {activeTab === 'details' ? (
                <form id="eventForm" onSubmit={handleSaveEvent}>
                  <fieldset disabled={selectedEvent?.status === 'cancelled'} className={styles.formFieldset}>
                    <div className={styles.formGroup}>
                      <label>Event Title</label>
                      <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className={styles.input} />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Description</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} className={styles.input} rows="3" />
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label>Start Date</label>
                        <input
                          required type="date" name="start_date"
                          value={formData.start_date} onChange={handleInputChange}
                          className={styles.input}
                          min={!selectedEvent ? todayString : undefined}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Start Time</label>
                        <input required type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} className={styles.input} />
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label>End Date (Last day of program)</label>
                        <input
                          required type="date" name="end_date"
                          value={formData.end_date} onChange={handleInputChange}
                          className={styles.input}
                          min={formData.start_date || (!selectedEvent ? todayString : undefined)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>End Time</label>
                        <input required type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} className={styles.input} />
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.formGroup}>
                        <label>Credit Hours (Auto-calculated)</label>
                        <input type="number" step="0.1" name="hours" value={formData.hours} onChange={handleInputChange} className={styles.input} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Required Volunteers</label>
                        <input type="number" name="required_volunteers" value={formData.required_volunteers} onChange={handleInputChange} className={styles.input} />
                      </div>
                    </div>

                    {isMultiDay && (
                      <div className={styles.multiDayBox}>
                        <div className={styles.multiDayHeader}>
                          <span className={styles.multiDayTitle}>📅 Multi-Day Event Schedule</span>
                        </div>
                        <div className={styles.formGroup} style={{ marginTop: '8px', marginBottom: 0 }}>
                          <label className={styles.multiDaySubtitle}>Select the specific days this event takes place within your date range:</label>
                          <div className={styles.daySelector}>
                            {DAYS_OF_WEEK.map(day => (
                              <button
                                key={day}
                                type="button"
                                className={`${styles.dayBtn} ${formData.recurrence_pattern?.includes(day) ? styles.dayActive : ''}`}
                                onClick={() => toggleRecurringDay(day)}
                                disabled={selectedEvent?.status === 'cancelled'}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </fieldset>
                </form>
              ) : (
                <div>
                  {volunteers.length === 0 ? (
                    <div className={styles.emptyState}>No volunteers have signed up for this event yet.</div>
                  ) : (
                    <>
                      <div className={styles.rosterTools}>
                        <div className={styles.broadcastBox}>
                          <input
                            type="text"
                            placeholder="Type an announcement to send to all volunteers..."
                            className={styles.broadcastInput}
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            disabled={selectedEvent?.status === 'cancelled'}
                          />
                          <button
                            type="button"
                            onClick={handleBroadcast}
                            disabled={isBroadcasting || !broadcastMsg.trim() || selectedEvent?.status === 'cancelled'}
                            className={styles.broadcastBtn}
                          >
                            {isBroadcasting ? 'Sending...' : 'Send'}
                          </button>
                        </div>

                        <button type="button" onClick={handleExportCSV} className={styles.csvBtn}>
                          📄 Export Roster
                        </button>
                      </div>

                      <table className={styles.volunteersTable}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Email / Contact</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {volunteers.map(vol => (
                            <tr key={vol.id}>
                              <td>
                                <div className={styles.primaryTextName}>{vol.profiles?.full_name || 'Unknown'}</div>
                                <div className={styles.secondaryText}>ID: {vol.profiles?.student_id || 'N/A'}</div>
                              </td>
                              <td>
                                <div className={styles.primaryTextName}>{vol.profiles?.email || 'No email provided'}</div>
                                <div className={styles.secondaryText}>{vol.profiles?.phone_number || ''}</div>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${styles[`status-${vol.status}`]}`}>
                                  {vol.status}
                                </span>
                              </td>
                              <td>
                                {selectedEvent?.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    className={styles.removeVolBtn}
                                    onClick={() => {
                                      setSelectedVolunteer(vol);
                                      setRemovalReason('');
                                      setRemovalModal(true);
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              {selectedEvent && selectedEvent.status !== 'cancelled' && activeTab === 'details' && (
                <button type="button" onClick={handleCancelEvent} disabled={isSubmitting} className={styles.forceCancelBtn}>
                  Cancel Event
                </button>
              )}
              {selectedEvent && selectedEvent.status === 'cancelled' && activeTab === 'details' && (
                <button type="button" onClick={handleDeleteEvent} disabled={isSubmitting} className={styles.deleteBtn}>
                  Permanently Delete
                </button>
              )}
              <button onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Close</button>
              {activeTab === 'details' && selectedEvent?.status !== 'cancelled' && (
                <button type="submit" form="eventForm" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? 'Saving...' : selectedEvent ? 'Save Changes' : 'Publish Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {removalModal && selectedVolunteer && (
        <div className={styles.modalOverlay} onClick={() => { setRemovalModal(false); setSelectedVolunteer(null); setRemovalReason(''); }}>
          <div className={styles.removalModalContent} ref={removalModalRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <h2 className={styles.removalModalTitle}>Remove Volunteer</h2>
              <button
                className={styles.closeBtn}
                onClick={() => { setRemovalModal(false); setSelectedVolunteer(null); setRemovalReason(''); }}
              >
                &times;
              </button>
            </div>

            <div className={styles.removalModalBody}>
              <p className={styles.removalSubtitle}>
                You are removing <strong>{selectedVolunteer.profiles?.full_name || 'this volunteer'}</strong> from <strong>{selectedEvent?.title}</strong>. They will be notified with your reason.
              </p>

              <div className={styles.removalWarningBox}>
                ⚠️ This action is logged and may be reviewed by platform administrators.
              </div>

              <label className={styles.removalLabel}>
                Reason for Removal <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className={styles.removalTextarea}
                rows={4}
                placeholder="e.g. Volunteer was a no-show without notice, repeated misconduct, etc."
                value={removalReason}
                onChange={e => setRemovalReason(e.target.value)}
              />
            </div>

            <div className={styles.removalModalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => { setRemovalModal(false); setSelectedVolunteer(null); setRemovalReason(''); }}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.removeConfirmBtn}
                onClick={handleRemoveVolunteer}
                disabled={isRemoving || !removalReason.trim()}
              >
                {isRemoving ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}