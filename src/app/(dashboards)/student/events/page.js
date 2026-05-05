"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { useDebounce } from '../../../../hooks/useDebounce';
import { usePagination } from '../../../../hooks/usePagination';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import { calculateEventCapacity } from '../../../../utils/capacityMath';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 9; 

export default function StudentEventsPage() {
  const { session, loading: authLoading } = useSupabaseSession();

  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { currentPage, from, to, totalCount, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, reset: resetPagination } = usePagination(ITEMS_PER_PAGE);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-day selection state
  const [selectedDays, setSelectedDays] = useState([]);

  // Accessibility Focus Trap
  const modalRef = useFocusTrap(isModalOpen, () => setIsModalOpen(false));

  useEffect(() => {
    resetPagination();
  }, [debouncedSearch, resetPagination]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchEventsAndStatus();
    }
  }, [debouncedSearch, currentPage, session, authLoading]);

  const fetchEventsAndStatus = async () => {
    try {
      setLoading(true);
      if (!session) return;

      // 1. Fetch Profile (if we don't have it yet)
      let currentProfile = userProfile;
      if (!currentProfile) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(profile);
        currentProfile = profile;
      }

      const todayString = new Date().toISOString().split('T')[0];

      // 2. Fetch the Paginated Events from our secure View
      let query = supabase
        .from('student_events_view')
        .select('*', { count: 'exact' })
        .gte('end_date', todayString)
        .eq('status', 'active');

      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,organization_name.ilike.%${debouncedSearch}%`);
      }

      const { data: eventsData, count, error: eventsError } = await query
        .order('start_date', { ascending: true })
        .range(from, to);

      if (eventsError) throw eventsError;

      // 3. Fetch ONLY the registrations for these specific events (for Capacity Math)
      const eventIds = eventsData ? eventsData.map(e => e.id) : [];
      let regData = [];
      if (eventIds.length > 0) {
        const { data: capacityRegs } = await supabase
          .from('registrations')
          .select('id, event_id, status')
          .in('event_id', eventIds)
          .neq('status', 'rejected')
          .neq('status', 'cancelled');
        
        regData = capacityRegs || [];
      }

      // 4. Fetch the Student's own registrations
      const { data: myRegData, error: myRegError } = await supabase
        .from('registrations')
        .select('*')
        .eq('student_id', currentProfile.id);

      if (myRegError) throw myRegError;
      setMyRegistrations(myRegData || []);

      // 5. Reconstruct the data shape for the UI
      const formattedEvents = eventsData ? eventsData.map(e => ({
        ...e,
        entities: { organization_name: e.organization_name },
        registrations: regData.filter(r => r.event_id === e.id) // Attach relevant regs for capacity
      })) : [];

      setEvents(formattedEvents);
      setTotalCount(count || 0);

    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (event) => {
    setSelectedEvent(event);
    setSelectedDays([]);
    setIsModalOpen(true);
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent || !userProfile) return;

    if (selectedEvent.is_recurring && selectedEvent.recurrence_pattern && selectedDays.length === 0) {
      return alert("Please select at least one day you plan to attend.");
    }

    setIsProcessing(true);
    try {
      // --- MULTI-DAY MATH ---
      let expectedHours = 0;
      
      if (selectedEvent.is_recurring && selectedEvent.recurrence_pattern && selectedDays.length > 0) {
        const start = new Date(selectedEvent.start_date);
        const end = new Date(selectedEvent.end_date);
        let occurrenceCount = 0;

        // Create a temporary date to loop with
        let checkDate = new Date(start);

        // Loop through every single day from start to end
        while (checkDate <= end) {
          // Get the short name of the day (e.g., 'Mon', 'Tue')
          const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' }); 
          
          // If the student's selected days includes this specific calendar day, count it
          if (selectedDays.includes(dayName)) {
            occurrenceCount++;
          }
          
          // Move to the next day
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        expectedHours = occurrenceCount * (selectedEvent.hours || 0);
      } else {
        // Logic for single-day events
        expectedHours = selectedEvent.hours || 0;
      }
      // ----------------------------------

      const selectedDaysString = selectedDays.length > 0 ? selectedDays.join(', ') : null;

      // ATOMIC RPC CALL
      const { data, error } = await supabase.rpc('register_for_event_safely', {
        p_event_id: selectedEvent.id,
        p_student_id: userProfile.id,
        p_expected_hours: expectedHours,
        p_selected_days: selectedDaysString
      });

      if (error) throw error;

      if (data.success) {
        alert(`Successfully registered! You are projected to earn ${expectedHours} hours.`);
        await fetchEventsAndStatus();
        setIsModalOpen(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Failed to register. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnregister = async (registrationId) => {
    const confirmCancel = window.confirm(`Are you sure you want to unregister from "${selectedEvent.title}"?`);
    if (!confirmCancel) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', registrationId);
      if (error) throw error;
      
      alert("You have been unregistered.");
      
      // Optimistic update for unregister to avoid a full refetch
      setMyRegistrations(myRegistrations.filter(r => r.id !== registrationId));
      setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, registrations: e.registrations.filter(r => r.id !== registrationId) } : e));
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Unregister error:", error);
      alert("Failed to unregister.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate dynamic expected hours for the UI preview
  let dynamicExpectedHours = 0;
  if (selectedEvent) {
    if (selectedEvent.is_recurring && selectedEvent.recurrence_pattern && selectedDays.length > 0) {
      const start = new Date(selectedEvent.start_date);
      const end = new Date(selectedEvent.end_date);
      let occurrenceCount = 0;
      let checkDate = new Date(start);

      while (checkDate <= end) {
        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' }); 
        if (selectedDays.includes(dayName)) {
          occurrenceCount++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }
      dynamicExpectedHours = occurrenceCount * (selectedEvent.hours || 0);
    } else {
      dynamicExpectedHours = selectedEvent.hours || 0;
    }
  }

  const existingRegistration = selectedEvent ? myRegistrations.find(reg => reg.event_id === selectedEvent.id) : null;
  
  // Calculate Modal Capacity
  const modalActiveRegs = selectedEvent?.registrations?.filter(r => r.status !== 'rejected') || [];
  const modalCapacity = selectedEvent ? calculateEventCapacity(selectedEvent.required_volunteers, modalActiveRegs.length) : null;
  const modalIsFull = modalCapacity?.status === 'Full';

  if (authLoading || (loading && events.length === 0 && !searchQuery)) {
    return <div className={styles.loadingState}>Loading volunteer opportunities...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Find Volunteer Events</h1>
          <p className={styles.subtitle}>Browse and register for upcoming opportunities.</p>
        </div>
        
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="Search events or orgs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </header>

      {loading && events.length === 0 ? (
        <div className={styles.loadingState}>Loading volunteer opportunities...</div>
      ) : (
        <>
          <div className={styles.eventsGrid}>
            {events.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>No Events Found</h2>
                <p>Check back later or try adjusting your search!</p>
              </div>
            ) : (
              events.map(event => {
                const isRegistered = myRegistrations.some(reg => reg.event_id === event.id);
                
                // --- CAPACITY MATH ---
                const activeRegistrations = event.registrations?.filter(r => r.status !== 'rejected') || [];
                const capacityData = calculateEventCapacity(event.required_volunteers, activeRegistrations.length);
                const isFull = capacityData.status === 'Full';

                return (
                  <div 
                    key={event.id} 
                    className={`${styles.eventCard} ${isRegistered ? styles.registeredCard : ''}`}
                    onClick={() => openModal(event)}
                  >
                    <div className={styles.cardHeader}>
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      {isRegistered && <span className={styles.registeredBadge}>Registered</span>}
                    </div>
                    <div className={styles.orgName}>🏢 {event.entities?.organization_name || 'Organization'}</div>
                    <div className={styles.eventMeta}>📅 {event.start_date} {event.start_time && `to ${event.end_date}`}</div>
                    <div className={styles.eventMeta}>⏱️ {event.hours} Hours / Day</div>
                    
                    <div className={styles.eventMeta}>
                      {capacityData.status !== 'Unlimited' ? (
                        <span className={isFull && !isRegistered ? styles.capacityFull : styles.capacityAvailable}>
                          👥 {isFull ? 'Event Full' : `${capacityData.spotsLeft} Spots Left`}
                        </span>
                      ) : (
                        <span className={styles.capacityAvailable}>👥 Unlimited Spots</span>
                      )}
                    </div>

                    {event.is_recurring && (
                      <div className={styles.recurringPill}>
                        🔄 Occurs on: <strong>{event.recurrence_pattern}</strong>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {totalCount > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.pageInfo}>
                Showing {totalCount === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} events
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

      {isModalOpen && selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitleText}>{selectedEvent.title}</h2>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>&times;</button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                {selectedEvent.description}
              </p>
              
              <div className={styles.modalInfoBox}>
                <div className={styles.infoRow}><strong>Organization:</strong> {selectedEvent.entities?.organization_name}</div>
                <div className={styles.infoRow}><strong>Program Window:</strong> {selectedEvent.start_date} to {selectedEvent.end_date}</div>
                <div className={styles.infoRow}><strong>Daily Time:</strong> {selectedEvent.start_time} - {selectedEvent.end_time}</div>
                <div className={styles.infoRow}><strong>Daily Credit:</strong> {selectedEvent.hours} Hours</div>
              </div>

              {existingRegistration ? (
                <div className={styles.successBox}>
                  <h3 className={styles.successTitle}>✅ You are registered!</h3>
                  {existingRegistration.selected_days && (
                    <div className={styles.infoRow}>
                      <strong className={styles.successLabel}>Committed Days:</strong> 
                      <span className={styles.successText}>{existingRegistration.selected_days}</span>
                    </div>
                  )}
                  <div className={styles.creditText}>
                    <strong className={styles.successLabel}>Total Expected Credit:</strong> 
                    <span className={styles.creditHighlight}>{existingRegistration.expected_hours} Hours</span>
                  </div>
                </div>
              ) : (
                <>
                  {selectedEvent.is_recurring && selectedEvent.recurrence_pattern && (
                    <div className={styles.daySelectionBox}>
                      <strong className={styles.daySelectionTitle}>Which days will you attend?</strong>
                      <p className={styles.daySelectionSubtitle}>Select all the days you can commit to. Your hours will multiply based on your selection.</p>
                      
                      <div className={styles.daySelector}>
                        {selectedEvent.recurrence_pattern.split(', ').map(day => (
                          <button 
                            key={day} 
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`${styles.dayBtn} ${selectedDays.includes(day) ? styles.dayActive : ''}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.projectedCreditBox}>
                    <strong className={styles.projectedLabel}>Projected Credit Earned:</strong>
                    <span className={styles.projectedCreditHighlight}>{dynamicExpectedHours} Hours</span>
                  </div>
                </>
              )}
            </div>
            
            <div className={styles.modalActions}>
              {existingRegistration && (
                <button 
                  onClick={() => handleUnregister(existingRegistration.id)}
                  disabled={isProcessing}
                  className={styles.unregisterBtnModal}
                >
                  {isProcessing ? 'Processing...' : 'Unregister from Event'}
                </button>
              )}

              <div className={styles.actionGroupRight}>
                <button onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Close</button>
                
                {!existingRegistration && (
                  <button 
                    onClick={handleRegister} 
                    disabled={
                      isProcessing || 
                      (selectedEvent.is_recurring && selectedDays.length === 0) ||
                      modalIsFull
                    }
                    className={styles.submitBtn}
                  >
                    {isProcessing ? 'Registering...' : modalIsFull ? 'Event Full' : 'Confirm Registration'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}