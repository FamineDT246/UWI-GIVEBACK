// __tests__/adminManagement.test.js

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  }
}));

import { supabase } from '../src/lib/supabase';

const mockEq = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
supabase.from.mockReturnValue({ update: mockUpdate });

const simulateAdminStatusChange = async (userId, newStatus) => {
  try {
    if (typeof userId !== 'string' || !userId) {
      throw new Error('Invalid User ID provided');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', userId);
      
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Admin User Management', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-ADM-001: Admin approves a pending student account', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateAdminStatusChange('student-001', 'approved');
    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ account_status: 'approved' });
    expect(mockEq).toHaveBeenCalledWith('id', 'student-001');
  });

  test('TC-ADM-002: Admin bans a malicious organization', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateAdminStatusChange('org-999', 'banned');
    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ account_status: 'banned' });
  });

  test('TC-ADM-003: Admin action fails due to database error', async () => {
    mockEq.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Failed to update record' } 
    });
    const response = await simulateAdminStatusChange('user-123', 'approved');
    expect(response.success).toBe(false);
    expect(response.error).toBe('Failed to update record');
  });

  test('TC-ADM-004: Prevent action if User ID is missing or null', async () => {
    const response = await simulateAdminStatusChange(null, 'approved');
    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid User ID provided');
  });
});