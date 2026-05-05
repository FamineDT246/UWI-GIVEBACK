import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>UWI Give Back</h1>
      <p className={styles.subtitle}>
        Connecting the UWI Cave Hill community with meaningful volunteer opportunities. 
        Track your hours, build your profile, and make a difference across Barbados.
      </p>
      
      <div className={styles.buttonGroup}>
        <Link href="/login" className={styles.primaryBtn}>
          Log In to Portal
        </Link>
        <Link href="/register" className={styles.secondaryBtn}>
          Create an Account
        </Link>
      </div>
    </main>
  );
}