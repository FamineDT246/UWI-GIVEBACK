import React from 'react';
import styles from './EventStatusBadge.module.css'; // Or whatever your CSS file is

export default function EventStatusBadge({ status, startDate, endDate }) {
  // 1. Manually cancelled events always show as cancelled
  if (status === 'cancelled') {
    return <span className={styles.cancelledBadge}>Cancelled</span>;
  }

  // 2. The centralized time-travel check
  const eventEndDate = new Date(endDate || startDate);
  eventEndDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventEndDate < today) {
    return <span className={styles.pastBadge}>Past Event</span>;
  }

  // 3. Otherwise, it is active
  return <span className={styles.activeBadge}>Active</span>;
}
