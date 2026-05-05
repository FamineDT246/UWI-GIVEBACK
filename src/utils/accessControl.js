export function verifyAccess(userRole, isAdmin, accountStatus, targetRoute) {
  // NEW PATCH: Prevent crash if targetRoute is missing/null
  if (typeof targetRoute !== 'string') {
    return { granted: false, redirect: '/login', reason: 'invalid_route' };
  }

  // Admins bypass everything
  if (isAdmin === true) {
    return { granted: true, redirect: null };
  }

  // Banned or Pending users are locked out of all dashboards
  if (accountStatus === 'banned') return { granted: false, redirect: '/login', reason: 'banned' };
  if (accountStatus === 'pending') return { granted: false, redirect: '/login', reason: 'pending' };
  
  // Standard approved routing logic
  if (userRole === 'student') {
    if (targetRoute.startsWith('/student')) return { granted: true, redirect: null };
    return { granted: false, redirect: '/student', reason: 'wrong_dashboard' };
  }

  if (userRole === 'entity') {
    if (targetRoute.startsWith('/entity')) return { granted: true, redirect: null };
    return { granted: false, redirect: '/entity', reason: 'wrong_dashboard' };
  }

  return { granted: false, redirect: '/login', reason: 'invalid_role' };
}