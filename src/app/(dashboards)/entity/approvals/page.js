"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { useDebounce } from '../../../../hooks/useDebounce';
import { usePagination } from '../../../../hooks/usePagination';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import { sanitizeUrl } from '../../../../utils/sanitizeUrl';
import { validateFileUpload } from '../../../../utils/fileValidation';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 10;

export default function EntityApprovalsPage() {
  const { session, loading: authLoading } = useSupabaseSession();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { currentPage, from, to, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, pageInfo, reset } = usePagination(ITEMS_PER_PAGE);

  const approveModalRef = useFocusTrap(isApproveModalOpen, () => setIsApproveModalOpen(false));
  const rejectModalRef = useFocusTrap(isRejectModalOpen, () => setIsRejectModalOpen(false));

  const fetchSubmissions = async () => {
    if (!session) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id, status, expected_hours, evidence_url, created_at, feedback, selected_days, student_id,
          profiles:student_id ( full_name, student_id ),
          events!inner ( id, title, hours, end_date, entity_id )
        `)
        .eq('events.entity_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      alert("Failed to load approvals data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchSubmissions();
  }, [session]);

  useEffect(() => {
    reset(); 
  }, [debouncedSearch, activeTab, reset]);

  const openApproveModal = (sub) => {
    setSelectedSubmission(sub);
    setFeedbackText('');
    setEvidenceFile(null);
    setIsApproveModalOpen(true);
  };

  const openRejectModal = (sub) => {
    setSelectedSubmission(sub);
    setFeedbackText('');
    setIsRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    
    const eventEndDate = new Date(selectedSubmission.events?.end_date);
    eventEndDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventEndDate > today) {
      return alert("You cannot approve hours until the event has officially ended.");
    }

    if (evidenceFile) {
      const validation = validateFileUpload(evidenceFile);
      if (!validation.isValid) return alert(validation.error);
    }

    setIsProcessing(true);

    try {
      let publicEvidenceUrl = selectedSubmission.evidence_url;

      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${selectedSubmission.student_id}/${Date.now()}_entity_override.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, evidenceFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(fileName);
        publicEvidenceUrl = publicUrlData.publicUrl;
      }

      const finalFeedback = feedbackText.trim() || "Hours verified and approved by the organization.";

      const { error } = await supabase
        .from('registrations')
        .update({ 
          status: 'approved', 
          feedback: finalFeedback,
          evidence_url: publicEvidenceUrl
        })
        .eq('id', selectedSubmission.id);
      
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedSubmission.student_id,
        title: "Hours Approved! 🎉",
        message: `Your expected hours for "${selectedSubmission.events.title}" were approved. Feedback: "${finalFeedback}"`
      });

      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, status: 'approved', feedback: finalFeedback, evidence_url: publicEvidenceUrl } : s));
      
      setIsApproveModalOpen(false);
    } catch (error) {
      console.error("Approval error:", error);
      alert("Failed to approve hours.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!feedbackText.trim() || !selectedSubmission) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: 'rejected', feedback: feedbackText })
        .eq('id', selectedSubmission.id);
      
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedSubmission.student_id,
        title: "Action Required: Submission Rejected",
        message: `Your submission for "${selectedSubmission.events.title}" needs attention. Feedback: "${feedbackText}"`
      });

      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, status: 'rejected', feedback: feedbackText } : s));
      
      setIsRejectModalOpen(false);
    } catch (error) {
      console.error("Rejection error:", error);
      alert("Failed to reject submission.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = (sub.profiles?.full_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                          (sub.events?.title?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
                          (sub.profiles?.student_id?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
    return matchesSearch && sub.status === activeTab;
  });

  const displayData = filteredSubmissions.slice(from, to + 1);

  useEffect(() => {
    setTotalCount(filteredSubmissions.length);
  }, [filteredSubmissions.length, setTotalCount]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (authLoading || loading) return <div className={styles.loadingState}>Loading Approval Dashboard...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Verify Volunteer Hours</h1>
        <p className={styles.subtitle}>Review submitted evidence and approve or reject student hours.</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          {['pending', 'approved', 'rejected'].map(tab => {
            const count = submissions.filter(s => s.status === tab).length;
            return (
              <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
              </button>
            );
          })}
        </div>
        <div className={styles.searchBox}>
          <input type="text" placeholder="Search by student or event..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.tableContainer} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <table className={styles.adminTable}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Event Title</th>
              <th>Expected Credit</th>
              <th>Evidence</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr><td colSpan="6" className={styles.emptyState}>No {activeTab} submissions found.</td></tr>
            ) : displayData.map(sub => {
              const hasEvidence = !!sub.evidence_url;
              const eventEndDate = new Date(sub.events?.end_date); eventEndDate.setHours(0, 0, 0, 0);
              const isEventFinished = eventEndDate <= today;
              const canApprove = hasEvidence && isEventFinished;
              
              let lockReason = "";
              if (!isEventFinished) lockReason = "Event has not ended yet.";
              else if (!hasEvidence) lockReason = "Awaiting student evidence upload.";

              return (
                <tr key={sub.id}>
                  <td data-label="Student">
                    <div className={styles.primaryTextName}>{sub.profiles?.full_name || 'Unknown'}</div>
                    <div className={styles.secondaryText}>{sub.profiles?.student_id || 'No ID'}</div>
                  </td>
                  <td data-label="Event Title">
                    <div className={styles.primaryTextName}>{sub.events?.title || 'Unknown Event'}</div>
                    {sub.selected_days && <div className={styles.secondaryText}>Days: {sub.selected_days}</div>}
                  </td>
                  <td data-label="Expected Credit">
                    <strong className={styles.highlightText}>{sub.expected_hours || sub.events?.hours || 0} hrs</strong>
                  </td>
                  <td data-label="Evidence">
                    {hasEvidence
                      ? <a href={sanitizeUrl(sub.evidence_url)} target="_blank" rel="noopener noreferrer" className={styles.evidenceLink}>📄 View File</a>
                      : <span className={styles.noEvidence}>No Evidence</span>}
                  </td>
                  <td data-label="Status">
                    <span className={`${styles.statusBadge} ${styles[`status-${sub.status}`]}`}>{sub.status}</span>
                  </td>
                  <td data-label="Action">
                    <div className={styles.actionGroup}>
                      {sub.status !== 'approved' && (
                        <button 
                          onClick={() => openApproveModal(sub)} 
                          disabled={isProcessing} 
                          className={`${styles.btn} ${styles.approveBtn}`} 
                        >
                          ✓ Approve
                        </button>
                      )}
                      {sub.status !== 'rejected' && (
                        <button 
                          onClick={() => openRejectModal(sub)} 
                          disabled={isProcessing} 
                          className={`${styles.btn} ${styles.rejectBtn}`}
                        >
                          ✗ Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationContainer}>
        <div className={styles.pageInfo}>{pageInfo}</div>
        <div className={styles.paginationControls}>
          <button className={styles.pageBtn} disabled={!canGoPrev || loading} onClick={prevPage}>Previous</button>
          <button className={styles.pageBtn} disabled={!canGoNext || loading} onClick={nextPage}>Next</button>
        </div>
      </div>

      {isApproveModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsApproveModalOpen(false)}>
          <div className={styles.modalContent} ref={approveModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitleSuccess}>Approve & Review</h3>
            
            {!selectedSubmission?.evidence_url && (
              <div className={styles.warningBox}>
                <strong className={styles.warningTitle}>
                  ⚠️ Student has not provided evidence.
                </strong>
                <p className={styles.warningText}>
                  You can upload a sign-in sheet or photo on their behalf to approve this record.
                </p>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,.csv"
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  className={styles.fileInput}
                />
              </div>
            )}

            <p className={styles.modalSubtitle}>
              Leave an optional review or feedback for <strong>{selectedSubmission?.profiles?.full_name}</strong>. They will see this on their dashboard.
            </p>
            <textarea 
              value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., Thank you for your hard work today!"
              className={styles.textarea} rows="3"
            />
            <div className={styles.modalActions}>
              <button onClick={() => setIsApproveModalOpen(false)} className={styles.cancelBtn} disabled={isProcessing}>Cancel</button>
              <button 
                onClick={handleApprove} 
                className={styles.approveBtnModal} 
                disabled={isProcessing || (!selectedSubmission?.evidence_url && !evidenceFile)} 
              >
                {isProcessing ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRejectModalOpen(false)}>
          <div className={styles.modalContent} ref={rejectModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitleDanger}>Reject Submission</h3>
            <p className={styles.modalSubtitle}>
              Please provide a reason for rejecting the hours for <strong>{selectedSubmission?.profiles?.full_name}</strong> so they can fix it.
            </p>
            <textarea 
              value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., The uploaded image is blurry."
              className={styles.textarea} rows="4" required
            />
            <div className={styles.modalActions}>
              <button onClick={() => setIsRejectModalOpen(false)} className={styles.cancelBtn} disabled={isProcessing}>Cancel</button>
              <button onClick={handleReject} className={styles.dangerBtn} disabled={!feedbackText.trim() || isProcessing}>
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}