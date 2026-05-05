// __tests__/hoursApproval.test.js

// 1. We mock the base Supabase object FIRST so Jest doesn't get confused by hoisting
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../src/lib/supabase';

// 2. THEN we create our chained mock functions
const mockEq = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

// 3. Attach the chain to the main 'from' mock
supabase.from.mockReturnValue({ update: mockUpdate });

// Simulating the frontend function when an Organization clicks "Approve"
const simulateApproveHours = async (registrationId, newStatus) => {
  try {
    // Guard against malformed inputs before hitting the DB
    if (typeof registrationId !== 'string' || !registrationId) {
      throw new Error('Invalid Registration ID provided');
    }

    const { error } = await supabase
      .from('registrations')
      .update({ status: newStatus })
      .eq('id', registrationId);
      
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Organization Hours Approval Flow', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-HAP-001: Organization approves student hours', async () => {
    // Arrange
    mockEq.mockResolvedValueOnce({ data: null, error: null });

    // Act
    const response = await simulateApproveHours('reg-555', 'approved');

    // Assert: Verify the exact database chain was called correctly
    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('registrations');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'approved' });
    expect(mockEq).toHaveBeenCalledWith('id', 'reg-555');
  });

  test('TC-HAP-002: Organization lacks RLS permissions to approve', async () => {
    // Arrange
    mockEq.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Row Level Security policy violation' } 
    });

    // Act
    const response = await simulateApproveHours('reg-999', 'approved');

    // Assert
    expect(response.success).toBe(false);
    expect(response.error).toBe('Row Level Security policy violation');
  });


  test('TC-HAP-003: Prevent query if Registration ID is missing', async () => {
    // Act
    const response = await simulateApproveHours(null, 'approved');

    // Assert
    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid Registration ID provided');
  });
});