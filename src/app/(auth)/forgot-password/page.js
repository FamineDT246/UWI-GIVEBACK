"use client";

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, message: '', type: '' });

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: '', type: '' });
    
    try {
      // The redirectTo URL must be registered in your Supabase dashboard under Authentication -> URL Configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setStatus({ 
        loading: false, 
        message: 'If an account exists with this email, a recovery link has been sent.', 
        type: 'success' 
      });
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
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to receive a recovery link</p>
        </div>

        {status.message && (
          <div className={`${styles.alert} ${status.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleResetRequest} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className={styles.input} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={status.loading} 
            className={styles.submitBtn}
          >
            {status.loading ? 'Sending...' : 'Send Recovery Link'}
          </button>
        </form>

        <div className={styles.footer}>
          Remember your password? <Link href="/login" className={styles.footerLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}