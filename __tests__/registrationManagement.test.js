// __tests__/registrationManagement.test.js

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  }
}));

import { supabase } from '../src/lib/supabase';

const mockEq = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
supabase.from.mockReturnValue({ update: mockUpdate, delete: mockDelete });

// Simulate Entity rejecting or Admin force-approving
const simulateUpdateRegistrationStatus = async (regId, newStatus) => {
  try {
    // Guard against malformed inputs
    if (typeof regId !== 'string' || !regId) {
      throw new Error('Invalid Registration ID provided');
    }

    const { error } = await supabase.from('registrations').update({ status: newStatus }).eq('id', regId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Simulate Admin purging a fake registration
const simulatePurgeRegistration = async (regId) => {
  try {
    // Guard against malformed inputs
    if (typeof regId !== 'string' || !regId) {
      throw new Error('Invalid Registration ID provided');
    }

    const { error } = await supabase.from('registrations').delete().eq('id', regId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Registration Rejections and Admin Actions', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-RGM-001: Organization rejects student hours', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateUpdateRegistrationStatus('reg-001', 'rejected');

    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'rejected' });
    expect(mockEq).toHaveBeenCalledWith('id', 'reg-001');
  });

  test('TC-RGM-002: Admin overrides and Force Approves hours', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateUpdateRegistrationStatus('reg-002', 'approved');

    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'approved' });
    expect(mockEq).toHaveBeenCalledWith('id', 'reg-002');
  });

  test('TC-RGM-003: Admin Purges a registration completely', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulatePurgeRegistration('reg-malicious');

    expect(response.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'reg-malicious');
  });

  
  test('TC-RGM-004: Action fails due to database error', async () => {
    mockEq.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Database transaction failed' } 
    });
    const response = await simulateUpdateRegistrationStatus('reg-003', 'rejected');

    expect(response.success).toBe(false);
    expect(response.error).toBe('Database transaction failed');
  });

 
  test('TC-RGM-005: Prevent query if Registration ID is missing', async () => {
    const response = await simulatePurgeRegistration(null);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid Registration ID provided');
  });
});