// src/utils/capacityMath.js

export function calculateEventCapacity(requiredSpots, currentRegistrations) {
  // Equivalence Class: Invalid Data Types (Strings, Booleans, NaN)
  if (
    (requiredSpots !== null && requiredSpots !== undefined && typeof requiredSpots !== 'number') || 
    typeof currentRegistrations !== 'number' ||
    isNaN(requiredSpots) || 
    isNaN(currentRegistrations)
  ) {
    return { status: 'Error', spotsLeft: null };
  }

  // Equivalence Class: Invalid Data (Negative numbers)
  if (requiredSpots < 0 || currentRegistrations < 0) {
    return { status: 'Error', spotsLeft: null };
  }

  // Equivalence Class: Unlimited Spots
  if (requiredSpots === null || requiredSpots === undefined || requiredSpots === 0) {
    return { status: 'Unlimited', spotsLeft: '∞' };
  }

  const spotsLeft = requiredSpots - currentRegistrations;

  // Boundary Value Analysis logic
  if (spotsLeft > 0) {
    return { status: 'Available', spotsLeft: spotsLeft };
  } else {
    return { status: 'Full', spotsLeft: 0 };
  }
}