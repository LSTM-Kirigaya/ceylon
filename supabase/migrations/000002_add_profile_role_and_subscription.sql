-- =============================================
-- Migration: Add role and subscription tier to profiles
-- =============================================

-- Add role field to profiles table
-- Available roles: admin, super_user, user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' 
CHECK (role IN ('admin', 'super_user', 'user'));

-- Add subscription tier field to profiles table
-- Available tiers: free, pro, team, enterprise
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' 
CHECK (subscription_tier IN ('free', 'pro', 'team', 'enterprise'));

-- Add subscription expiration date for commercial tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add index for faster queries on subscription tier
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- =============================================
-- Update handle_new_user function to include default role
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role TEXT;
BEGIN
    -- Check if this is the first user (make them admin)
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
-- Function to check if user has admin privileges
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_user')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function to get user's subscription tier
-- =============================================
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
-- Update RLS policies to allow admins to view all profiles
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- New policy: Users can view their own profile OR admins can view all
CREATE POLICY "Users can view profiles" 
    ON public.profiles FOR SELECT 
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_user')
        )
    );

-- New policy: Users can update their own profile (but not their role)
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        -- Note: role changes should be done through admin functions only
    );

-- New policy: Only admins can update role and subscription fields
CREATE POLICY "Admins can manage all profiles" 
    ON public.profiles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_user')
        )
    );

-- Keep insert policy for new users
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =============================================
-- Seed data: Set first existing user as admin (if any exists)
-- =============================================
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin'
);

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON COLUMN public.profiles.role IS 'User role: admin, super_user, or user';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Subscription tier: free, pro, team, or enterprise';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'Subscription expiration date for commercial tracking';
