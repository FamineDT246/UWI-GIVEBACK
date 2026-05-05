import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in! Let's find out where they belong.
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_admin) {
          router.replace('/admin');
        } else if (profile?.role === 'entity') {
          router.replace('/entity');
        } else {
          router.replace('/student');
        }
      } else {
        // No active session, it is safe to show the Login/Register page
        setCheckingAuth(false);
      }
    };

    checkUserAndRedirect();
  }, [router]);

  return { checkingAuth };
}