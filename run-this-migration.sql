-- Simple migration for user presence tracking
-- Run this file in your Supabase SQL editor

-- Add last_seen column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Create index for efficient last_seen queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);
