import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <main className={styles.main}>
      <div className={styles.heroOverlay} />
      <div className={styles.container}>
        <h1 className={styles.title}>
          Empowering the <span className={styles.highlight}>UWI</span> Community
        </h1>
        
        <p className={styles.subtitle}>
          The UWI Give Back platform connects students with meaningful volunteer opportunities. Join us in making a difference.
        </p>
        
        <div className={styles.buttonGroup}>
          <Link href="/register" className={styles.primaryButton}>
            Get Started
          </Link>
          <Link href="/login" className={styles.secondaryButton}>
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}