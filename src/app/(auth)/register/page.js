"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAsync } from '../../../hooks/useAsync';
import { useRedirectIfAuthenticated } from '../../../hooks/useRedirectIfAuthenticated';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  
  //  Bouncer Hook 
  const { checkingAuth } = useRedirectIfAuthenticated();
  
  const { loading, execute } = useAsync();
  const [role, setRole] = useState('student');
  const [notification, setNotification] = useState({ text: '', type: '' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 6) formatted = `(${raw.slice(0, 3)}) ${raw.slice(3)}`;
    else if (raw.length > 6) formatted = `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6, 10)}`;
    setPhoneNumber(formatted);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setNotification({ text: '', type: '' });
    try {
      await execute(async () => {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error("Registration failed. Could not retrieve user ID.");

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          role,
          full_name: role === 'student' ? fullName : contactPerson,
          student_id: role === 'student' ? studentId : null,
          phone_number: phoneNumber || null,
          account_status: 'pending'
        });
        if (profileError) throw profileError;

        if (role === 'entity') {
          const { error: entityError } = await supabase.from('entities').upsert({
            id: userId,
            organization_name: orgName,
            contact_person: contactPerson,
            contact_email: email,
            phone_number: phoneNumber || null,
            website_url: website || null,
            account_status: 'pending'
          });
          if (entityError) throw entityError;
        }

        setNotification({ text: 'Account created! Your application is pending staff approval. Redirecting...', type: 'success' });
        setTimeout(() => router.push('/login'), 3000);
      });
    } catch (error) {
      setNotification({ text: error.message, type: 'error' });
    }
  };

  // If the bouncer is checking their ID, hold at the door
  if (checkingAuth) return null;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.registerCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join UWI Give Back</h1>
          <p className={styles.subtitle}>Create your account below</p>
        </div>

        <div className={styles.roleToggle}>
          <button className={`${styles.toggleBtn} ${role === 'student' ? styles.active : ''}`} onClick={() => setRole('student')} type="button">I am a Student</button>
          <button className={`${styles.toggleBtn} ${role === 'entity' ? styles.active : ''}`} onClick={() => setRole('entity')} type="button">I am an Organization</button>
        </div>

        {notification.text && (
          <div className={`${styles.alert} ${notification.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {notification.text}
          </div>
        )}

        <form onSubmit={handleRegister} className={styles.form}>
          {role === 'student' ? (
            <>
              <div className={styles.inputGroup}><label>Full Name</label><input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={styles.input} /></div>
              <div className={styles.inputGroup}><label>UWI Student ID</label><input type="text" required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={styles.input} /></div>
            </>
          ) : (
            <>
              <div className={styles.inputGroup}><label>Organization Name</label><input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)} className={styles.input} /></div>
              <div className={styles.inputGroup}><label>Contact Person (Full Name)</label><input type="text" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={styles.input} /></div>
              <div className={styles.inputGroup}><label>Public Contact Email (Optional)</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. info@org.com" className={styles.input} /></div>
              <div className={styles.inputGroup}><label>Website URL (Optional)</label><input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.example.com" className={styles.input} /></div>
            </>
          )}

          <div className={styles.inputGroup}><label>Official Login Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} /></div>
          <div className={styles.inputGroup}>
            <label>Phone Number (Optional)</label>
            <input type="tel" value={phoneNumber} onChange={handlePhoneChange} placeholder="(XXX) XXX-XXXX" maxLength="14" className={styles.input} />
          </div>
          <div className={styles.inputGroup}><label>Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className={styles.input} /></div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account? <a href="/login" className={styles.footerLink}>Log In Here</a>
        </div>
      </div>
    </div>
  );
}