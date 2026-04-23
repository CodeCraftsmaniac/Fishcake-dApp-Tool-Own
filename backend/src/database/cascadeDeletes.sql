-- Cascade delete triggers for maintaining referential integrity
-- Run this in Supabase SQL Editor after the main migration

-- Function to clean up related records on wallet delete
CREATE OR REPLACE FUNCTION public.cleanup_wallet_related()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related events
  DELETE FROM mining_events WHERE wallet_id = OLD.id;
  
  -- Delete related drops
  DELETE FROM mining_drops WHERE event_id IN (
    SELECT id FROM mining_events WHERE wallet_id = OLD.id
  );
  
  -- Delete related rewards
  DELETE FROM mining_rewards WHERE event_id IN (
    SELECT id FROM mining_events WHERE wallet_id = OLD.id
  );
  
  -- Delete related logs (optional - keep for audit)
  -- DELETE FROM mining_logs WHERE wallet_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS wallet_cleanup_trigger ON public.mining_wallets;

-- Create trigger
CREATE TRIGGER wallet_cleanup_trigger
  BEFORE DELETE ON public.mining_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_wallet_related();

-- Function to clean up drops and rewards when event is deleted
CREATE OR REPLACE FUNCTION public.cleanup_event_related()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mining_drops WHERE event_id = OLD.id;
  DELETE FROM mining_rewards WHERE event_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS event_cleanup_trigger ON public.mining_events;

-- Create trigger
CREATE TRIGGER event_cleanup_trigger
  BEFORE DELETE ON public.mining_events
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_event_related();
