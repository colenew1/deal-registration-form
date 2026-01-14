-- Migration: Rename tables for clarity
-- Run this AFTER the initial schema has been created

-- Rename account_executives to sales_reps
ALTER TABLE account_executives RENAME TO sales_reps;

-- Rename known_tsds to known_partners
ALTER TABLE known_tsds RENAME TO known_partners;
