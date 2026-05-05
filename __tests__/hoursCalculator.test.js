import { calculateProjectedHours } from '../src/utils/hoursCalculator';

describe('Projected Hours Calculation', () => {
  
  describe('Equivalence Class Partitioning', () => {
    test('Class 1: Standard Recurring Event (Multiple days)', () => {
      const result = calculateProjectedHours(3, ['Monday', 'Wednesday', 'Friday'], true);
      expect(result).toBe(9); // 3 hours * 3 days
    });

    test('Class 2: Standard Single-Day Event', () => {
      // Array is ignored if not recurring
      const result = calculateProjectedHours(5, ['Monday', 'Tuesday'], false);
      expect(result).toBe(5); 
    });

    test('Class 3: Invalid Negative Hours', () => {
      const result = calculateProjectedHours(-2, ['Monday'], true);
      expect(result).toBe(0);
    });

    // What if a string is passed instead of a number?
    test('Class 4: Invalid Data Type for Hours (String)', () => {
      const result = calculateProjectedHours("four", ['Monday'], true);
      expect(result).toBe(0);
    });

    // What if days is a string instead of an array?
    test('Class 5: Invalid Data Type for Days Array (String)', () => {
      const result = calculateProjectedHours(4, "Monday", true);
      expect(result).toBe(0);
    });
  });

  describe('Boundary Value Analysis', () => {
    test('Boundary 1: Exactly 0 selected days for recurring event', () => {
      const result = calculateProjectedHours(4, [], true);
      expect(result).toBe(0);
    });

    test('Boundary 2: Exactly 1 selected day for recurring event', () => {
      const result = calculateProjectedHours(4, ['Monday'], true);
      expect(result).toBe(4);
    });

    test('Boundary 3: Null array passed', () => {
      const result = calculateProjectedHours(4, null, true);
      expect(result).toBe(0);
    });
  });
});