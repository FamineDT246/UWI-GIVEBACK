import { validateDailyHours } from '../src/utils/validateHours';

describe('Daily Hours Validation - Unit Testing', () => {

  describe('Equivalence Class Partitioning (ECP)', () => {
    test('Class 1: Valid Normal Hours (Integer)', () => {
      const result = validateDailyHours(5);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    // Testing fractional hours (very common in timesheets)
    test('Class 2: Valid Normal Hours (Decimal)', () => {
      const result = validateDailyHours(4.5);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('Class 3: Invalid Data Type (String)', () => {
      const result = validateDailyHours("five");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a valid number.');
    });

    // Testing Null/Undefined inputs
    test('Class 4: Invalid Data Type (Null)', () => {
      const result = validateDailyHours(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a valid number.');
    });

    test('Class 5: Invalid Extreme High Hours', () => {
      const result = validateDailyHours(100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot log more than 24 hours in a single day.');
    });

    // Testing extreme low (negative) hours
    test('Class 6: Invalid Negative Hours', () => {
      const result = validateDailyHours(-5);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hours must be greater than 0.');
    });
  });

  describe('Boundary Value Analysis (BVA)', () => {
    test('Boundary 0: Exactly zero hours (Invalid)', () => {
      const result = validateDailyHours(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hours must be greater than 0.');
    });

    test('Boundary 1: Minimum valid hours (Valid)', () => {
      const result = validateDailyHours(1);
      expect(result.isValid).toBe(true);
    });

    test('Boundary 24: Maximum valid hours (Valid)', () => {
      const result = validateDailyHours(24);
      expect(result.isValid).toBe(true);
    });

    test('Boundary 25: Just over maximum hours (Invalid)', () => {
      const result = validateDailyHours(25);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Cannot log more than 24 hours in a single day.');
    });
  });

});