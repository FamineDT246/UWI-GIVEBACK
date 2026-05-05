// __tests__/studentRegistration.test.js

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn(),
  },
}));

import { supabase } from '../src/lib/supabase';

// Simulating the exact frontend function that fires when a student clicks "Register"
const simulateStudentRegistration = async (registrationPayload) => {
  try {
    // Guard against malformed payloads (Crash Prevention)
    if (!registrationPayload || typeof registrationPayload !== 'object') {
      throw new Error('Invalid registration payload');
    }

    // Guard against missing critical relational data
    if (!registrationPayload.student_id || !registrationPayload.event_id) {
      throw new Error('Missing required student or event IDs');
    }

    const { error } = await supabase.from('registrations').insert([registrationPayload]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Student Registration Flow', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-SRG-001: Student registers for an event successfully', async () => {
    supabase.insert.mockResolvedValueOnce({ data: null, error: null });

    const mockPayload = {
      student_id: 'student-789',
      event_id: 'event-101',
      status: 'pending',
      expected_hours: 4
    };

    const response = await simulateStudentRegistration(mockPayload);

    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('registrations');
    expect(supabase.insert).toHaveBeenCalledWith([mockPayload]);
  });

  test('TC-SRG-002: Database rejects registration', async () => {
    supabase.insert.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Foreign key constraint violated' } 
    });

    const response = await simulateStudentRegistration({ student_id: 'invalid', event_id: 'invalid' });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Foreign key constraint violated');
  });

  
  test('TC-SRG-003: Prevent query if payload is null', async () => {
    const response = await simulateStudentRegistration(null);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid registration payload');
  });

  
  test('TC-SRG-004: Prevent query if required IDs are missing', async () => {
    const incompletePayload = { status: 'pending', expected_hours: 4 };
    const response = await simulateStudentRegistration(incompletePayload);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Missing required student or event IDs');
  });
});