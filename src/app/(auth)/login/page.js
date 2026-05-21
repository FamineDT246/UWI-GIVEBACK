"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useAsync } from '../../../hooks/useAsync';
import { useRedirectIfAuthenticated } from '../../../hooks/useRedirectIfAuthenticated';
import styles from './page.module.css';

// Extracted to a separate component to allow Suspense boundary for useSearchParams
function LoginErrorHandler() {
  const searchParams = useSearchParams();
  const middlewareError = searchParams.get('error');

  if (!middlewareError) return null;
  return (
    <div className={`${styles.alert} ${styles.alertError}`}>
      {decodeURIComponent(middlewareError)}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { checkingAuth } = useRedirectIfAuthenticated();
  const { loading, execute } = useAsync();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      await execute(async () => {
        // Step 1: Authenticate credentials
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        const userId = authData.user.id;
        
        // Step 2: Fetch the user's platform profile to determine routing and access
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_admin, account_status')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileError) throw profileError;
        if (!profileData) {
          await supabase.auth.signOut();
          throw new Error("Profile data not found. Please register this account first.");
        }

        const { role: userRole, is_admin: isAdmin } = profileData;
        let currentStatus = profileData.account_status;

        // Step 3: Check specific entity status if applicable
        if (userRole === 'entity') {
          const { data: entityData } = await supabase
            .from('entities')
            .select('account_status')
            .eq('id', userId)
            .single();
          if (entityData) currentStatus = entityData.account_status;
        }

        // Step 4: Enforce administrative holds (Pending approval or Banned)
        if (!isAdmin) {
          if (currentStatus === 'pending') {
            await supabase.auth.signOut();
            throw new Error("Your account is currently under review by staff. Please check back later.");
          }
          if (currentStatus === 'banned') {
            await supabase.auth.signOut();
            throw new Error("Your account has been suspended. Please contact administration.");
          }
          if (currentStatus !== 'approved') {
            await supabase.auth.signOut();
            throw new Error("Your account does not have access to the platform.");
          }
        }

        // Step 5: Route to appropriate dashboard
        if (isAdmin || userRole === 'staff') router.push('/admin');
        else if (userRole === 'student') router.push('/student');
        else if (userRole === 'entity') router.push('/entity');
        else {
          await supabase.auth.signOut();
          throw new Error("Invalid user role assigned.");
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
    }
  };

  if (checkingAuth) return null;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.backgroundOverlay} />
      
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>UWI Give Back</h1>
          <p className={styles.subtitle}>Sign in to continue</p>
        </div>

        <Suspense fallback={<div className={styles.loadingText}>Loading...</div>}>
          <LoginErrorHandler />
        </Suspense>

        {errorMsg && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
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
          
          <div className={styles.inputGroup}>
            <div className={styles.passwordHeader}>
              <label>Password</label>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className={styles.input} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitBtn}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footer}>
          Don&apos;t have an account? <Link href="/register" className={styles.footerLink}>Register Here</Link>
        </div>
      </div>
    </div>
  );
}