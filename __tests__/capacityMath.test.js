// __tests__/capacityMath.test.js

import { calculateEventCapacity } from '../src/utils/capacityMath';

describe('Event Capacity Logic - Unit Testing', () => {
  
  describe('Equivalence Class Partitioning (ECP)', () => {
    test('Class 1: Valid Normal Event (Spots available)', () => {
      const result = calculateEventCapacity(10, 2);
      expect(result.status).toBe('Available');
      expect(result.spotsLeft).toBe(8);
    });

    test('Class 2: Unlimited Capacity Event', () => {
      const result = calculateEventCapacity(null, 5);
      expect(result.status).toBe('Unlimited');
      expect(result.spotsLeft).toBe('∞');
    });

    test('Class 3: Invalid Negative Capacity', () => {
      const result = calculateEventCapacity(-5, 2);
      expect(result.status).toBe('Error');
    });

    // Testing a negative registered count
    test('Class 4: Invalid Negative Registered Count', () => {
      const result = calculateEventCapacity(10, -2);
      expect(result.status).toBe('Error');
    });

    // Testing malformed inputs
    test('Class 5: Invalid Data Type (String)', () => {
      const result = calculateEventCapacity("ten", 2);
      expect(result.status).toBe('Error');
    });
  });

  describe('Boundary Value Analysis (BVA)', () => {
    const MAX_CAPACITY = 5;

    test('Boundary 1: Just below capacity (Should be Available)', () => {
      const result = calculateEventCapacity(MAX_CAPACITY, 4);
      expect(result.status).toBe('Available');
      expect(result.spotsLeft).toBe(1);
    });

    test('Boundary 2: Exactly at capacity (Should be Full)', () => {
      const result = calculateEventCapacity(MAX_CAPACITY, 5);
      expect(result.status).toBe('Full');
      expect(result.spotsLeft).toBe(0);
    });

    test('Boundary 3: Over capacity (Should be Full, not negative)', () => {
      const result = calculateEventCapacity(MAX_CAPACITY, 6);
      expect(result.status).toBe('Full');
      expect(result.spotsLeft).toBe(0);
    });
  });

});