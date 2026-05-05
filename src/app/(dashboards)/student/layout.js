"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DashboardLayout from '../../../components/DashboardLayout';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';

export default function StudentLayout({ children }) {
  const router = useRouter();
  const { session, loading: authLoading } = useSupabaseSession();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const studentLinks = [
    { name: 'Overview', path: '/student' },
    { name: 'Find Events', path: '/student/events' },
    { name: 'My Registrations', path: '/student/submissions' }
  ];

  useEffect(() => {
    const checkAccess = async () => {
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', session.user.id)
        .single();

      // If they are an admin, let them pass. If not, they MUST be a student.
      if (!profile?.is_admin && profile?.role !== 'student') {
        if (profile?.role === 'entity') return router.replace('/entity');
        return router.replace('/login');
      }

      setIsAuthorized(true);
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [session, authLoading, router]);

  if (authLoading || !isAuthorized) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Verifying student access...</div>;
  }

  return (
    <DashboardLayout navItems={studentLinks} settingsPath="/student/settings" portalBadge="Student">
      {children}
    </DashboardLayout>
  );
}