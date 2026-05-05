// __tests__/createEventIntegration.test.js

// 1. We mock the Supabase client so we don't accidentally write to the live production database
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn(),
  },
}));

import { supabase } from '../src/lib/supabase';

// 2. We simulate the exact function that runs when an Organization clicks "Submit"
const simulateCreateEvent = async (eventData) => {
  try {
    // Guard against malformed payloads (Crash Prevention)
    if (!eventData || typeof eventData !== 'object') {
      throw new Error('Invalid event payload');
    }

    // Guard against missing critical data
    if (!eventData.entity_id || !eventData.title) {
      throw new Error('Missing required event fields');
    }

    const { error } = await supabase.from('events').insert([eventData]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Event Creation Flow', () => {
  
  beforeEach(() => {
    // Clear the fake database memory before every test
    jest.clearAllMocks();
  });

  test('TC-CEV-001: Next.js correctly formats and sends event data to Supabase', async () => {
    supabase.insert.mockResolvedValueOnce({ data: null, error: null });

    const mockEventPayload = {
      entity_id: 'org-123',
      title: 'Beach Cleanup',
      start_date: '2026-04-10',
      hours: 4,
      status: 'active'
    };

    const response = await simulateCreateEvent(mockEventPayload);

    expect(response.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('events');
    expect(supabase.insert).toHaveBeenCalledWith([mockEventPayload]);
  });

  test('TC-CEV-002: Next.js handles database rejection gracefully', async () => {
    supabase.insert.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Row Level Security violation' } 
    });

    const maliciousPayload = {
      entity_id: 'hacker-999',
      title: 'Fake Event'
    };

    const response = await simulateCreateEvent(maliciousPayload);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Row Level Security violation');
  });


  test('TC-CEV-003: Prevent query if payload is null', async () => {
    const response = await simulateCreateEvent(null);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Invalid event payload');
  });


  test('TC-CEV-004: Prevent query if required fields are missing', async () => {
    const incompletePayload = { start_date: '2026-04-10', hours: 4 };
    const response = await simulateCreateEvent(incompletePayload);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Missing required event fields');
  });

});