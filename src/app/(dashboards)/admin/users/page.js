"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAsync } from '../../../../hooks/useAsync';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import { useSupabaseSession } from '../../../../hooks/useSupabaseSession';
import { usePagination } from '../../../../hooks/usePagination';
import { sanitizeUrl } from '../../../../utils/sanitizeUrl';
import styles from './page.module.css'; 
import commonStyles from '../../../styles/common.module.css';

const ITEMS_PER_PAGE = 10;

export default function UserManagementPage() {
  const { session, loading: authLoading } = useSupabaseSession();
  const { execute } = useAsync();
  
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [students, setStudents] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const studentModalRef = useFocusTrap(modalType === 'student', closeModal);
  const entityModalRef = useFocusTrap(modalType === 'entity', closeModal);

  const { currentPage, from, to, setTotalCount, nextPage, prevPage, canGoPrev, canGoNext, pageInfo, reset } = usePagination(ITEMS_PER_PAGE);

  function closeModal() { setSelectedUser(null); setModalType(null); setModalData([]); }

  const fetchUsers = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      const [{ data: studentData, error: se }, { data: entityData, error: ee }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
        supabase.from('entities').select('*').order('created_at', { ascending: false }),
      ]);
      if (se) throw se;
      if (ee) throw ee;
      setStudents(studentData || []);
      setEntities(entityData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to load user data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && !authLoading) {
      fetchUsers();
    } else if (!session && !authLoading) {
      setLoading(false);
    }
  }, [fetchUsers, session, authLoading]);

  useEffect(() => { reset(); }, [activeTab, searchQuery, statusFilter, reset]);

  const openStudentModal = async (student) => {
    if (!session) return;
    setSelectedUser(student); setModalType('student'); setModalData([]); setModalLoading(true);
    try {
      const { data, error } = await supabase.from('registrations')
        .select('id, status, created_at, events ( title, start_date, hours, status, entities ( organization_name ) )')
        .eq('student_id', student.id).order('created_at', { ascending: false });
      if (error) throw error;
      setModalData(data || []);
    } catch (error) { console.error(error); }
    finally { setModalLoading(false); }
  };

  const openEntityModal = async (entity) => {
    if (!session) return;
    setSelectedUser(entity); setModalType('entity'); setModalData([]); setModalLoading(true);
    try {
      const { data, error } = await supabase.from('events')
        .select('id, title, start_date, hours, required_volunteers, status, is_recurring, recurrence_pattern, registrations ( id, status )')
        .eq('entity_id', entity.id).neq('status', 'cancelled').order('start_date', { ascending: true });
      if (error) throw error;
      setModalData(data || []);
    } catch (error) { console.error(error); }
    finally { setModalLoading(false); }
  };

  const handleStatusChange = async (userId, userType, newStatus) => {
    if (!session) return;
    const table = userType === 'student' ? 'profiles' : 'entities';
    if (!window.confirm(newStatus === 'banned' ? `BAN this ${userType}?` : `Change status to ${newStatus.toUpperCase()}?`)) return;
    setProcessingId(userId);
    try {
      await execute(async () => {
        const { error } = await supabase.from(table).update({ account_status: newStatus }).eq('id', userId);
        if (error) throw error;
        if (userType === 'student') {
          setStudents(prev => prev.map(s => s.id === userId ? { ...s, account_status: newStatus } : s));
        } else {
          setEntities(prev => prev.map(e => e.id === userId ? { ...e, account_status: newStatus } : e));
        }
        if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, account_status: newStatus }));
      });
    } catch (error) {
      console.error(error);
      alert("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || s.account_status === statusFilter);
  });

  const filteredEntities = entities.filter(e => {
    const matchesSearch = e.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (statusFilter === 'all' || e.account_status === statusFilter);
  });

  const displayData = activeTab === 'students' 
    ? filteredStudents.slice(from, to + 1) 
    : filteredEntities.slice(from, to + 1);

  useEffect(() => {
    setTotalCount(activeTab === 'students' ? filteredStudents.length : filteredEntities.length);
  }, [filteredStudents.length, filteredEntities.length, activeTab, setTotalCount]);

  if (authLoading || (loading && students.length === 0 && entities.length === 0)) return <div className={commonStyles.loadingState}>Loading user directory...</div>;

  const ActionButtons = ({ id, type, status }) => (
    <div className={styles.actionGroup} onClick={e => e.stopPropagation()}>
      {status !== 'approved' && (
        <button onClick={() => handleStatusChange(id, type, 'approved')} disabled={processingId === id} className={`${commonStyles.btn} ${commonStyles.approveBtn}`}>✓ Approve</button>
      )}
      {status !== 'banned' ? (
        <button onClick={() => handleStatusChange(id, type, 'banned')} disabled={processingId === id} className={`${commonStyles.btn} ${commonStyles.rejectBtn}`}>✗ Ban</button>
      ) : (
        <button onClick={() => handleStatusChange(id, type, 'pending')} disabled={processingId === id} className={`${commonStyles.btn} ${styles.restoreBtn}`}>↺ Restore</button>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>Approve pending accounts, view details, and manage platform access.</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'students' ? styles.activeTab : ''}`} onClick={() => setActiveTab('students')}>Students ({students.length})</button>
          <button className={`${styles.tab} ${activeTab === 'entities' ? styles.activeTab : ''}`} onClick={() => setActiveTab('entities')}>Organizations ({entities.length})</button>
        </div>
        <div className={styles.searchBox}>
          <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={commonStyles.searchInput} />
        </div>
      </div>

      <div className={styles.subTabsContainer}>
        <div className={styles.subTabs}>
          {['pending', 'approved', 'banned', 'all'].map(status => {
            const count = activeTab === 'students'
              ? students.filter(s => status === 'all' || s.account_status === status).length
              : entities.filter(e => status === 'all' || e.account_status === status).length;
            return (
              <button key={status} onClick={() => setStatusFilter(status)}
                className={`${styles.subTabBtn} ${statusFilter === status ? styles.activeSubTab : ''}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={styles.countPill}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={commonStyles.adminTable}>
          {activeTab === 'students' && <thead><tr><th>Student Name</th><th>UWI ID</th><th>Contact Email</th><th>Account Status</th><th>Actions</th></tr></thead>}
          {activeTab === 'entities' && <thead><tr><th>Organization Name</th><th>Public Email</th><th>Phone</th><th>Account Status</th><th>Actions</th></tr></thead>}
          <tbody>
            {activeTab === 'students' && (
              displayData.length === 0
                ? <tr><td colSpan="5" className={commonStyles.loadingState}>No {statusFilter !== 'all' ? statusFilter : ''} students found.</td></tr>
                : displayData.map(student => (
                  <tr key={student.id} className={styles.clickableRow} onClick={() => openStudentModal(student)}>
                    <td data-label="Student Name" className={commonStyles.primaryTextName}>{student.full_name || 'Incomplete Profile'}</td>
                    <td data-label="UWI ID">{student.student_id || 'N/A'}</td>
                    <td data-label="Contact Email">{student.email || 'N/A'}</td>
                    <td data-label="Account Status"><span className={`${commonStyles.statusBadge} ${commonStyles[`status-${student.account_status}`]}`}>{student.account_status}</span></td>
                    <td data-label="Actions"><ActionButtons id={student.id} type="student" status={student.account_status} /></td>
                  </tr>
                ))
            )}
            {activeTab === 'entities' && (
              displayData.length === 0
                ? <tr><td colSpan="5" className={commonStyles.loadingState}>No {statusFilter !== 'all' ? statusFilter : ''} organizations found.</td></tr>
                : displayData.map(entity => (
                  <tr key={entity.id} className={styles.clickableRow} onClick={() => openEntityModal(entity)}>
                    <td data-label="Organization Name" className={commonStyles.primaryTextName}>{entity.organization_name || 'Incomplete Profile'}</td>
                    <td data-label="Public Email">{entity.contact_email || 'N/A'}</td>
                    <td data-label="Phone">{entity.phone_number || 'N/A'}</td>
                    <td data-label="Account Status"><span className={`${commonStyles.statusBadge} ${commonStyles[`status-${entity.account_status}`]}`}>{entity.account_status}</span></td>
                    <td data-label="Actions"><ActionButtons id={entity.id} type="entity" status={entity.account_status} /></td>
                  </tr>
                ))
            )}
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

      {selectedUser && modalType === 'student' && (
        <div className={commonStyles.modalOverlay} onClick={closeModal}>
          <div className={commonStyles.modalContent} ref={studentModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <div className={commonStyles.modalHeader}>
              <h2 className={styles.modalTitle}>Student Profile</h2>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
            </div>
            <div className={commonStyles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Full Name</span><span className={styles.detailValue}>{selectedUser.full_name || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>UWI Student ID</span><span className={styles.detailValue}>{selectedUser.student_id || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Email</span><span className={styles.detailValue}>{selectedUser.email || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Phone</span><span className={styles.detailValue}>{selectedUser.phone_number || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Account Status</span><span className={`${commonStyles.statusBadge} ${commonStyles[`status-${selectedUser.account_status}`]}`}>{selectedUser.account_status}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Joined</span><span className={styles.detailValue}>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}</span></div>
              </div>
              <div className={styles.modalInlineActions}>
                <ActionButtons id={selectedUser.id} type="student" status={selectedUser.account_status} />
              </div>
              <h3 className={styles.modalSectionTitle}>Registered Events</h3>
              {modalLoading ? <div className={commonStyles.loadingState}>Loading...</div>
                : modalData.length === 0 ? <div className={commonStyles.loadingState}>No event registrations found.</div>
                : <div className={styles.modalEventList}>{modalData.map(reg => (
                  <div key={reg.id} className={styles.modalEventCard}>
                    <div className={styles.modalEventTop}>
                      <span className={styles.modalEventTitle}>{reg.events?.title || 'Unknown Event'}</span>
                      <span className={`${commonStyles.statusBadge} ${commonStyles[`status-${reg.status}`]}`}>{reg.status}</span>
                    </div>
                    <div className={styles.modalEventMeta}>
                      <span>🏢 {reg.events?.entities?.organization_name || 'Unknown Org'}</span>
                      <span>📅 {reg.events?.start_date || '—'}</span>
                      <span>⏱️ {reg.events?.hours || '—'} hrs</span>
                    </div>
                  </div>
                ))}</div>}
            </div>
          </div>
        </div>
      )}

      {selectedUser && modalType === 'entity' && (
        <div className={commonStyles.modalOverlay} onClick={closeModal}>
          <div className={commonStyles.modalContent} ref={entityModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <div className={commonStyles.modalHeader}>
              <h2 className={styles.modalTitle}>Organization Profile</h2>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
            </div>
            <div className={commonStyles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Organization Name</span><span className={styles.detailValue}>{selectedUser.organization_name || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Contact Email</span><span className={styles.detailValue}>{selectedUser.contact_email || '—'}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Phone</span><span className={styles.detailValue}>{selectedUser.phone_number || '—'}</span></div>
                
                <div className={styles.detailBlock}>
                  <span className={styles.detailLabel}>Website</span>
                  <span className={styles.detailValue}>
                    {selectedUser.website ? <a href={sanitizeUrl(selectedUser.website)} target="_blank" rel="noreferrer" className={styles.externalLink}>{selectedUser.website}</a> : '—'}
                  </span>
                </div>

                <div className={styles.detailBlock}><span className={styles.detailLabel}>Account Status</span><span className={`${commonStyles.statusBadge} ${commonStyles[`status-${selectedUser.account_status}`]}`}>{selectedUser.account_status}</span></div>
                <div className={styles.detailBlock}><span className={styles.detailLabel}>Joined</span><span className={styles.detailValue}>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}</span></div>
              </div>
              <div className={styles.modalInlineActions}>
                <ActionButtons id={selectedUser.id} type="entity" status={selectedUser.account_status} />
              </div>
              <h3 className={styles.modalSectionTitle}>Active Events</h3>
              {modalLoading ? <div className={commonStyles.loadingState}>Loading...</div>
                : modalData.length === 0 ? <div className={commonStyles.loadingState}>No active events found.</div>
                : <div className={styles.modalEventList}>{modalData.map(event => {
                  const signedUp = event.registrations?.filter(r => r.status !== 'rejected').length || 0;
                  return (
                    <div key={event.id} className={styles.modalEventCard}>
                      <div className={styles.modalEventTop}>
                        <span className={styles.modalEventTitle}>{event.title}</span>
                        <span className={`${commonStyles.statusBadge} ${commonStyles['status-active']}`}>active</span>
                      </div>
                      <div className={styles.modalEventMeta}>
                        <span>📅 {event.start_date}</span>
                        <span>⏱️ {event.hours || '—'} hrs</span>
                        <span>👥 {signedUp} / {event.required_volunteers || '∞'}</span>
                        {event.is_recurring && <span>🔄 {event.recurrence_pattern}</span>}
                      </div>
                    </div>
                  );
                })}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}