UWI-GIVEBACK
```markdown
# UWI-GIVEBACK

A comprehensive volunteer management portal built to streamline community service coordination and track student engagement across the university ecosystem.

## Overview
UWI-GIVEBACK bridges the gap between students seeking service hours and approved organizations requiring assistance. The platform manages the entire volunteer lifecycle, from organization onboarding and staff approval to student registration and hour tracking.

## Features
- **Tri-level Ecosystem:** Interfaces for Students, Organizations, and Staff.
- **Workflow Automation:** Admin dashboards for vetting and approving organizations.
- **Engagement Analytics:** Real-time tracking of volunteer hours and participation.
- **Professional Architecture:** Built with modular CSS for high maintainability.

## Quick Setup
1. **Clone & Install:**
   ```bash
   git clone [https://github.com/FamineDT246/uwi-giveback.git](https://github.com/FamineDT246/uwi-giveback.git)
   cd uwi-giveback
   npm install

2.Configure: Create a .env.local file with your Supabase credentials:
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

3.Launch:
    npm run dev