export function validateDailyHours(hours) {
  // Equivalence Class: Not a number or empty
  if (typeof hours !== 'number' || isNaN(hours)) {
    return { isValid: false, error: 'Input must be a valid number.' };
  }

  // Boundary Value: Exactly 0 or negative (Invalid)
  if (hours <= 0) {
    return { isValid: false, error: 'Hours must be greater than 0.' };
  }

  // Boundary Value: Exactly 24 (Valid maximum)
  if (hours > 24) {
    return { isValid: false, error: 'Cannot log more than 24 hours in a single day.' };
  }

  // Equivalence Class: Valid normal range (e.g., 1 to 23)
  return { isValid: true, error: null };
}