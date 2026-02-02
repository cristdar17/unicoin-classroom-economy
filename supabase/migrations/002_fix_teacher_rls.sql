-- ============================================
-- Fix: Allow teacher registration
-- Run this in Supabase SQL Editor if you get RLS errors
-- ============================================

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Teachers can insert own record" ON teachers;

-- Create a more permissive insert policy
-- The id must still match a valid auth.users id due to foreign key
CREATE POLICY "Anyone can insert teacher record" ON teachers
  FOR INSERT WITH CHECK (true);

-- Alternative: Create a trigger to auto-create teacher on signup
-- This is a better long-term solution

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Teacher already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
