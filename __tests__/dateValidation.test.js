import { validateEventDates } from '../src/utils/dateValidation';

describe('Event Date Validation', () => {
  // Helper function to get LOCAL YYYY-MM-DD strings to avoid UTC offset bugs in tests
  const getLocalFormat = (dateObj) => {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
  };

  const today = new Date();
  const todayStr = getLocalFormat(today);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalFormat(tomorrow);

  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = getLocalFormat(dayAfter);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalFormat(yesterday);

  describe('Equivalence Class Partitioning (ECP)', () => {
    test('Class 1: Valid future dates', () => {
      const result = validateEventDates(tomorrowStr, dayAfterStr);
      expect(result.isValid).toBe(true);
    });

    test('Class 2: Invalid past dates', () => {
      const result = validateEventDates(yesterdayStr, todayStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date cannot be in the past');
    });

    test('Class 3: Missing inputs (Start Date)', () => {
      const result = validateEventDates('', tomorrowStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing dates');
    });

    // What if the end date is the one missing?
    test('Class 4: Missing inputs (End Date)', () => {
      const result = validateEventDates(tomorrowStr, '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing dates');
    });

    // What if the input isn't a valid date string?
    test('Class 5: Invalid Data Type / Malformed String', () => {
      const result = validateEventDates('not-a-date', tomorrowStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format'); 
    });
  });

  describe('Boundary Value Analysis (BVA)', () => {
    test('Boundary 1: Start date is exactly today (Valid)', () => {
      const result = validateEventDates(todayStr, tomorrowStr);
      expect(result.isValid).toBe(true);
    });

    test('Boundary 2: End date is exactly the same as start date (Valid 1-day event)', () => {
      const result = validateEventDates(tomorrowStr, tomorrowStr);
      expect(result.isValid).toBe(true);
    });

    test('Boundary 3: End date is exactly 1 day before start date (Invalid)', () => {
      const result = validateEventDates(tomorrowStr, todayStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('End date cannot be before start date');
    });
  });
});