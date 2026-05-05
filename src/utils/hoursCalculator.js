// src/utils/hoursCalculator.js

export function calculateProjectedHours(hours, daysArray, isRecurring) {
  // 1. Validate Hours (Must be a positive number)
  if (typeof hours !== 'number' || isNaN(hours) || hours < 0) {
    return 0;
  }

  // 2. If it's a single-day event, ignore the array and just return the hours
  if (!isRecurring) {
    return hours;
  }


  // 3. If we reach here, it IS recurring. Validate the days array
  if (!Array.isArray(daysArray)) {
    return 0;
  }

  // 4. Calculate total
  return hours * daysArray.length;
}