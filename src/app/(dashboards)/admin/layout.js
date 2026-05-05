"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DashboardLayout from '../../../components/DashboardLayout';
import { useSupabaseSession } from '../../../hooks/useSupabaseSession';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { session, loading: authLoading } = useSupabaseSession(); 
  const [isAuthorized, setIsAuthorized] = useState(false);

  const adminLinks = [
    { name: 'Global Dashboard', path: '/admin' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Events', path: '/admin/events' },
    { name: 'Hours', path: '/admin/hours' },
    { name: 'Settings', path: '/admin/settings' }
  ];

  useEffect(() => {
    const checkAccess = async () => {
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile || (profile.is_admin !== true && profile.role !== 'staff')) {
        if (profile?.role === 'student') return router.replace('/student');
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
    return <div className="loadingState">Verifying security credentials...</div>;
  }

  return (
    <DashboardLayout navItems={adminLinks} settingsPath="/admin/settings" portalBadge="Staff">
      {children}
    </DashboardLayout>
  );
}