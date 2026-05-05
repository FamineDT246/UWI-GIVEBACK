export function validateEventDates(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return { isValid: false, error: 'Missing dates' };

  // Check if the provided strings actually represent valid dates
  if (isNaN(Date.parse(startDateStr)) || isNaN(Date.parse(endDateStr))) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // 1. Get today's local date directly from the system clock components.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const todayLocalStr = `${year}-${month}-${day}`;

  // 2. YYYY-MM-DD strings can be safely compared alphabetically
  if (startDateStr < todayLocalStr) {
    return { isValid: false, error: 'Start date cannot be in the past' };
  }
  
  if (endDateStr < startDateStr) {
    return { isValid: false, error: 'End date cannot be before start date' };
  }

  return { isValid: true, error: null };
}