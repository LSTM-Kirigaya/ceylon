-- =============================================
-- Manual Migration: Add role and subscription tier to profiles
-- Run this in Supabase SQL Editor if migrations don't apply automatically
-- =============================================

-- Add role field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' 
CHECK (role IN ('admin', 'super_user', 'user'));

-- Add subscription tier field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' 
CHECK (subscription_tier IN ('free', 'pro', 'team', 'enterprise'));

-- Add subscription expiration date
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- Update trigger function to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
        default_role := 'admin';
    ELSE
        default_role := 'user';
    END IF;

    INSERT INTO public.profiles (id, email, display_name, avatar_url, role, subscription_tier)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        default_role,
        'free'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Helper Functions
-- =============================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_user')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's subscription tier
CREATE OR REPLACE FUNCTION public.get_subscription_tier(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    tier TEXT;
BEGIN
    SELECT subscription_tier INTO tier
    FROM public.profiles
    WHERE id = p_user_id;
    RETURN tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Example Queries
-- =============================================

-- Set a user as admin
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'user@example.com';

-- Set a user's subscription to pro
-- UPDATE public.profiles SET subscription_tier = 'pro', subscription_expires_at = '2025-12-31' WHERE email = 'user@example.com';

-- List all admins
-- SELECT * FROM public.profiles WHERE role IN ('admin', 'super_user');

-- List all pro users
-- SELECT * FROM public.profiles WHERE subscription_tier = 'pro';
