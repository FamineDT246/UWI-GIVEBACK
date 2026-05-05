"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { usePagination } from '../../../../hooks/usePagination';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import { validateFileUpload } from '../../../../utils/fileValidation';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 10;

export default function StudentSubmissionsPage() {
  const { session, loading: authLoading } = useSupabaseSession();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const { currentPage, from, to, totalCount, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, reset: resetPagination } = usePagination(ITEMS_PER_PAGE);

  // Upload Evidence Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const modalRef = useFocusTrap(isModalOpen, () => setIsModalOpen(false));

  useEffect(() => {
    resetPagination();
  }, [activeTab, resetPagination]);

  const fetchSubmissions = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);

      const { data, count, error } = await supabase
        .from('registrations')
        .select(`
          id, status, evidence_url, feedback, created_at, selected_days, expected_hours,
          events ( title, start_date, end_date, hours, entities ( organization_name ) )
        `, { count: 'exact' })
        .eq('student_id', session.user.id)
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setSubmissions(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  }, [session, activeTab, from, to, setTotalCount]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchSubmissions();
    }
  }, [fetchSubmissions, session, authLoading]);

  const handleUnregister = async (registrationId, eventTitle) => {
    const confirmCancel = window.confirm(`Are you sure you want to unregister from "${eventTitle}"? This cannot be undone.`);
    if (!confirmCancel) return;

    try {
      const { error } = await supabase.from('registrations').delete().eq('id', registrationId);
      if (error) throw error;

      alert("You have successfully unregistered from the event.");
      await fetchSubmissions(); 
    } catch (error) {
      console.error("Error unregistering:", error);
      alert("Failed to unregister. Please try again.");
    }
  };

  const openUploadModal = (sub) => {
    setSelectedSub(sub);
    setFile(null);
    setIsModalOpen(true);
  };

  const handleUpload = async () => {
    if (!file || !selectedSub) return;

    //  TIME TRAVEL CHECK 
    const eventEndDate = new Date(selectedSub.events?.end_date || selectedSub.events?.start_date);
    eventEndDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventEndDate > today) {
      return alert("You cannot upload evidence until the event has officially ended.");
    }

    // 🚨 1. RUN THE SECURITY CHECK FIRST 🚨
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      // If it fails, alert the user and immediately abort the function
      return alert(validation.error); 
    }

    // 2. ONLY PROCEED IF THE FILE IS SAFE
    setUploading(true);

    try {
      if (!session) return;
      
      // Ensure the extension matches the actual validated file, not just what the user named it
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(fileName);

      // Save the URL to the registration record
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ evidence_url: publicUrlData.publicUrl })
        .eq('id', selectedSub.id);

      if (updateError) throw updateError;

      alert("Evidence uploaded successfully! The organization will review it shortly.");
      setIsModalOpen(false);
      await fetchSubmissions();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload evidence. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || (loading && submissions.length === 0)) {
    return <div className={styles.loadingState}>Loading your registrations...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Registrations</h1>
        <p className={styles.subtitle}>Track your upcoming events, upload evidence, and review approved hours.</p>
      </header>

      <div className={styles.tabs}>
        {['pending', 'approved', 'rejected'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div>
        {submissions.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No {activeTab} registrations found.</h3>
            <p>Head over to &quot;Find Events&quot; to sign up for some opportunities!</p>
          </div>
        ) : (
          <>
            {submissions.map(sub => (
              <div key={sub.id} className={styles.submissionCard}>
                <div className={styles.details}>
                  <h3 className={styles.eventTitle}>{sub.events?.title || 'Unknown Event'}</h3>
                  
                  <div className={styles.metaData}>
                    <span>📅 Start Date: {sub.events?.start_date}</span>
                    <span className={styles.totalCredit}>⏱️ Total Credit: {sub.expected_hours || sub.events?.hours} Hours</span>
                    <span>🏢 Organization: {sub.events?.entities?.organization_name || 'N/A'}</span>
                  </div>

                  {sub.selected_days && (
                    <div className={styles.selectedDaysBadge}>
                      Committed Days: {sub.selected_days}
                    </div>
                  )}

                  {sub.feedback && (
                    <div className={`${styles.feedbackBox} ${sub.status === 'rejected' ? styles.feedbackRejected : styles.feedbackApproved}`}>
                      <strong className={sub.status === 'rejected' ? styles.feedbackLabelRejected : styles.feedbackLabelApproved}>
                        Entity Feedback:
                      </strong> 
                      <span className={styles.feedbackText}> {sub.feedback}</span>
                    </div>
                  )}
                </div>

                <div className={styles.actions}>
                  <div className={`${styles.statusBadge} ${styles[`status-${sub.status}`]}`}>
                    {sub.status}
                  </div>
                  
                  {sub.status === 'pending' && (
                    <>
                      <button onClick={() => openUploadModal(sub)} className={styles.updateBtn}>
                        {sub.evidence_url ? 'Update Evidence' : 'Upload Evidence'}
                      </button>

                      <button onClick={() => handleUnregister(sub.id, sub.events?.title)} className={styles.unregisterBtn}>
                        Cancel Registration
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {totalCount > 0 && (
              <div className={styles.paginationContainer}>
                <div className={styles.pageInfo}>
                  Showing {totalCount === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} submissions
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
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Upload Evidence</h3>
            <p className={styles.modalDesc}>
              Upload a photo of your signed timesheet or selfie at the event to claim your <strong>{selectedSub?.expected_hours} hours</strong> for {selectedSub?.events?.title}.
            </p>
            
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={(e) => setFile(e.target.files[0])} 
              className={styles.fileInput}
            />

            <div className={styles.modalActions}>
              <button onClick={() => setIsModalOpen(false)} disabled={uploading} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleUpload} disabled={!file || uploading} className={styles.submitUploadBtn}>
                {uploading ? 'Uploading...' : 'Submit Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}