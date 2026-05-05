// __tests__/authIntegration.test.js

// 1. Mock the Supabase Auth service
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    }
  }
}));

import { supabase } from '../src/lib/supabase';

// Simulate frontend Signup function
const simulateSignUp = async (email, password, role) => {
  try {
    // Guard against missing data
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } } 
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Simulate frontend Login function
const simulateLogin = async (email, password) => {
  try {
    // Guard against missing data
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

describe('Integration Test: Authentication Flow', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration (Sign Up)', () => {
    test('TC-AUT-001: New student signs up', async () => {
      supabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'new-user-123', email: 'test@student.uwi.edu' } },
        error: null
      });

      const response = await simulateSignUp('test@student.uwi.edu', 'SecurePass123!', 'student');

      expect(response.success).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@student.uwi.edu',
        password: 'SecurePass123!',
        options: { data: { role: 'student' } }
      });
    });
  });

  describe('User Authentication (Log In)', () => {
    test('TC-AUT-002: Existing user logs in', async () => {
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'existing-user' } },
        error: null
      });

      const response = await simulateLogin('valid@email.com', 'CorrectPassword');

      expect(response.success).toBe(true);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'valid@email.com',
        password: 'CorrectPassword'
      });
    });

    test('TC-AUT-003: Invalid credentials rejected', async () => {
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
      });

      const response = await simulateLogin('wrong@email.com', 'BadPassword');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid login credentials');
    });

    // NEW TEST CASE
    test('TC-AUT-004: Prevent auth request if data is missing', async () => {
      const response = await simulateLogin(null, '');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Email and password are required');
    });
  });
});