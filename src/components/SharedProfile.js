"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import styles from './SharedProfile.module.css';

export default function SharedProfile({ userType }) {
  const { session, loading: authLoading } = useSupabaseSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [notification, setNotification] = useState({ text: '', type: '' });

  const isStudent = userType === 'student';
  const tableName = isStudent ? 'profiles' : 'entities';

  const fetchProfile = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setFormData(data || {});
      setOriginalData(data || {});
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotification({ text: 'Failed to load profile data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [session, tableName]);

  useEffect(() => {
    if (!authLoading && session) {
      fetchProfile();
    } else if (!authLoading && !session) {
       setLoading(false);
    }
  }, [authLoading, session, fetchProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Phone Number Auto-Formatter 
  const handlePhoneChange = (e) => {
    // 1. Strip out all non-numeric characters
    const rawNumbers = e.target.value.replace(/\D/g, '');
    
    // 2. Format as (XXX) XXX-XXXX
    let formattedNumber = rawNumbers;
    if (rawNumbers.length > 3 && rawNumbers.length <= 6) {
      formattedNumber = `(${rawNumbers.slice(0, 3)}) ${rawNumbers.slice(3)}`;
    } else if (rawNumbers.length > 6) {
      formattedNumber = `(${rawNumbers.slice(0, 3)}) ${rawNumbers.slice(3, 6)}-${rawNumbers.slice(6, 10)}`;
    }

    setFormData({ ...formData, phone_number: formattedNumber });
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setNotification({ text: '', type: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    setSaving(true);
    setNotification({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from(tableName)
        .update(formData)
        .eq('id', session.user.id);

      if (error) throw error;
      
      setOriginalData(formData);
      setIsEditing(false);
      setNotification({ text: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setNotification({ text: 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Helper to format the Joined Date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading || loading) return <div className={styles.loadingState}>Loading profile...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{isStudent ? 'Student Profile' : 'Organization Profile'}</h1>
          <p className={styles.subtitle}>Manage your platform identity and contact information.</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
            ✏️ Edit Profile
          </button>
        )}
      </header>

      {notification.text && (
        <div className={notification.type === 'success' ? styles.successAlert : styles.errorAlert}>
          {notification.text}
        </div>
      )}

      {!isEditing ? (
        /* --- READ-ONLY VIEW MODE --- */
        <div className={styles.viewGrid}>
          {isStudent ? (
            <>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Full Name</span>
                <span className={styles.dataValue}>{formData.full_name || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>UWI Student ID</span>
                <span className={styles.dataValue}>{formData.student_id || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>University Email</span>
                <span className={styles.dataValue}>{formData.email || '—'}</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Organization Name</span>
                <span className={styles.dataValue}>{formData.organization_name || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Contact Person</span>
                <span className={styles.dataValue}>{formData.contact_person || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Official Account Email</span>
                <span className={styles.dataValue}>{formData.official_email || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Public Contact Email</span>
                <span className={styles.dataValue}>{formData.contact_email || '—'}</span>
              </div>
              <div className={styles.dataBlock}>
                <span className={styles.dataLabel}>Website</span>
                <span className={styles.dataValue}>
                  {formData.website ? (
                    <a href={formData.website} target="_blank" rel="noreferrer" className={styles.link}>
                      {formData.website}
                    </a>
                  ) : '—'}
                </span>
              </div>
            </>
          )}

          <div className={styles.dataBlock}>
            <span className={styles.dataLabel}>Phone Number</span>
            <span className={styles.dataValue}>{formData.phone_number || '—'}</span>
          </div>
          
          <div className={styles.dataBlock}>
            <span className={styles.dataLabel}>Account Status</span>
            <span className={styles.statusBadge}>{formData.account_status || 'Pending'}</span>
          </div>

          {/* 🚨 NEW: Joined Date 🚨 */}
          <div className={styles.dataBlock}>
            <span className={styles.dataLabel}>Joined Date</span>
            <span className={styles.dataValue}>{formatDate(formData.created_at)}</span>
          </div>
        </div>
      ) : (
        /* --- EDIT MODE FORM --- */
        <form onSubmit={handleSave} className={styles.formContainer}>
          {isStudent ? (
            <>
              {/* 🚨 LOCKED FIELDS FOR STUDENTS 🚨 */}
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input type="text" name="full_name" value={formData.full_name || ''} disabled className={styles.disabledInput} />
                <span className={styles.inputHelp}>Name changes must be requested through UWI Administration.</span>
              </div>
              <div className={styles.inputGroup}>
                <label>UWI Student ID</label>
                <input type="text" name="student_id" value={formData.student_id || ''} disabled className={styles.disabledInput} />
              </div>
              <div className={styles.inputGroup}>
                <label>University Email</label>
                <input type="email" name="email" value={formData.email || ''} disabled className={styles.disabledInput} />
              </div>
            </>
          ) : (
            <>
              {/* Entities can edit more, but their official account email is locked */}
              <div className={styles.inputGroup}>
                <label>Organization Name</label>
                <input type="text" name="organization_name" value={formData.organization_name || ''} onChange={handleChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Contact Person</label>
                <input type="text" name="contact_person" value={formData.contact_person || ''} onChange={handleChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label>Official Account Email</label>
                <input type="email" name="official_email" value={formData.official_email || ''} disabled className={styles.disabledInput} />
                <span className={styles.inputHelp}>This is your login email. It cannot be changed here.</span>
              </div>
              <div className={styles.inputGroup}>
                <label>Public Contact Email</label>
                <input type="email" name="contact_email" value={formData.contact_email || ''} onChange={handleChange} placeholder="Email for students to contact" />
              </div>
              <div className={styles.inputGroup}>
                <label>Website URL</label>
                <input type="url" name="website" value={formData.website || ''} onChange={handleChange} placeholder="https://..." />
              </div>
            </>
          )}

          {/* 🚨 FORMATTED PHONE FIELD 🚨 */}
          <div className={styles.inputGroup}>
            <label>Phone Number</label>
            <input 
              type="text" 
              name="phone_number" 
              value={formData.phone_number || ''} 
              onChange={handlePhoneChange} 
              placeholder="(XXX) XXX-XXXX"
              maxLength="14"
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={handleCancel} disabled={saving} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={styles.saveBtn}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}