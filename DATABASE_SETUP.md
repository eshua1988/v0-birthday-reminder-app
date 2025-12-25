# Database Setup Guide

This guide will help you set up the Supabase database for the Birthday Reminder App.

## Quick Setup

Use the v0 SQL Runner to execute the following scripts in order:

### Method 1: Run Individual Scripts (Recommended)

Execute each script from the `scripts/` folder in numerical order:

1. `001_create_birthdays_table.sql` - Creates the main birthdays table
2. `002_create_photos_storage.sql` - Sets up photo storage bucket
3. `005_fix_rls_policies.sql` - Configures Row Level Security
4. `006_add_notification_time.sql` - Adds notification time column
5. `007_add_notification_enabled.sql` - Adds notification enabled flag
6. `008_create_settings_table.sql` - Creates settings table
7. `009_add_default_notification_time.sql` - Adds default notification time
8. `010_create_auth_tables.sql` - Creates profiles table for users
9. `015_add_notification_times.sql` - Adds support for multiple notification times

### Method 2: Use Consolidated Script

Alternatively, you can run the consolidated setup script that combines all migrations:

```sql
-- See scripts/000_initial_setup.sql for the complete setup
```

## Using v0 SQL Runner

1. Open your v0 chat interface
2. The SQL scripts are located in the `scripts/` folder
3. v0 can execute these scripts directly against your Supabase database
4. Simply ask: "Run the database setup scripts" or "Execute script 001_create_birthdays_table.sql"

## Manual Setup via Supabase Dashboard

If you prefer to set up manually:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to the SQL Editor
4. Copy and paste each script content
5. Click "Run" to execute

## Verification

After running the scripts, verify the setup:

1. Check that all tables exist: `birthdays`, `settings`, `profiles`
2. Verify the storage bucket: `birthday-photos`
3. Test RLS policies by creating a test birthday entry

## Environment Variables

Make sure these environment variables are set in your Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

## Troubleshooting

### "Table already exists" error
- This is normal if you're re-running scripts
- The scripts use `IF NOT EXISTS` to avoid conflicts

### RLS Policy errors
- Make sure you're authenticated when testing
- Check that policies allow your user ID to access data

### Storage errors
- Verify the `birthday-photos` bucket exists
- Check bucket policies allow authenticated uploads

## Need Help?

If you encounter issues:
1. Check the Supabase logs in the Dashboard
2. Verify your environment variables are correct
3. Ask in the v0 chat for assistance
