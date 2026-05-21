"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import styles from './page.module.css'; // We will reuse the forgot-password CSS structure

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, message: '', type: '' });

  // Ensure the user actually reached this page via a valid Supabase recovery link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({
          loading: false,
          message: 'Invalid or expired recovery session. Please request a new link.',
          type: 'error'
        });
      }
    };
    checkSession();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', type: '' });
    
    try {
      // Supabase securely updates the user's password utilizing the active recovery session token
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setStatus({ 
        loading: false, 
        message: 'Password updated successfully! Redirecting to login...', 
        type: 'success' 
      });
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ loading: false, message: error.message, type: 'error' });
      } else {
        setStatus({ loading: false, message: 'An unexpected error occurred.', type: 'error' });
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backgroundOverlay} />
      
      <div className={styles.recoveryCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Please enter your new secure password</p>
        </div>

        {status.message && (
          <div className={`${styles.alert} ${status.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>New Password</label>
            <input 
              type="password" 
              required 
              minLength={8}
              value={newPassword} 
              disabled={status.type === 'error' && status.message.includes('expired')}
              onChange={(e) => setNewPassword(e.target.value)} 
              className={styles.input} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={status.loading || (status.type === 'error' && status.message.includes('expired'))} 
            className={styles.submitBtn}
          >
            {status.loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}