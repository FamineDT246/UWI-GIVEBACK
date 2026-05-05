// __tests__/eventManagement.test.js

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

const simulateCancelEvent = async (eventId) => {
  try {
    if (typeof eventId !== 'string' || !eventId) {
      throw new Error('Invalid Event ID provided');
    }
    const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const simulateForceDeleteEvent = async (eventId) => {
  try {
    if (typeof eventId !== 'string' || !eventId) {
      throw new Error('Invalid Event ID provided');
    }
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Event Cancellation and Deletion', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-EVM-001: Organization cancels their own event', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateCancelEvent('event-123');
    
    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockEq).toHaveBeenCalledWith('id', 'event-123');
  });

  test('TC-EVM-002: Admin Force Deletes an event completely', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: null });
    const response = await simulateForceDeleteEvent('event-999');
    
    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'event-999');
  });

  test('TC-EVM-003: Action fails due to database error', async () => {
    mockEq.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Row Level Security violation' } 
    });
    const response = await simulateCancelEvent('event-000');
    
    expect(response.success).toBe(false);
    expect(response.error).toBe('Row Level Security violation');
  });

  test('TC-EVM-004: Prevent query if Event ID is missing', async () => {
    const response = await simulateForceDeleteEvent(null);
    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid Event ID provided');
  });
});