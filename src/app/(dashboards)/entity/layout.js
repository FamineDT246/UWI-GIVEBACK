"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DashboardLayout from '../../../components/DashboardLayout';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';

export default function EntityLayout({ children }) {
  const router = useRouter();
  const { session, loading: authLoading } = useSupabaseSession();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const entityLinks = [
    { name: 'Dashboard', path: '/entity' },
    { name: 'Events', path: '/entity/events' },
    { name: 'Approvals', path: '/entity/approvals' },
  ];

  useEffect(() => {
    const checkAccess = async () => {
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', session.user.id)
        .single();

      // If they are an admin, let them pass. If not, they MUST be an entity.
      if (!profile?.is_admin && profile?.role !== 'entity') {
        if (profile?.role === 'student') return router.replace('/student');
        return router.replace('/login');
      }

      setIsAuthorized(true);
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [session, authLoading, router]);

  if (authLoading || !isAuthorized) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Verifying organization access...</div>;
  }

  return (
    <DashboardLayout navItems={entityLinks} settingsPath="/entity/settings" portalBadge="Organization">
      {children}
    </DashboardLayout>
  );
}