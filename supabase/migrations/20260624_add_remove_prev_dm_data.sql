-- Migration: Add remove_prev_dm_data column to automations table
ALTER TABLE automations ADD COLUMN IF NOT EXISTS remove_prev_dm_data BOOLEAN DEFAULT FALSE;
