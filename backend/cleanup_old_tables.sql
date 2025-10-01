-- ============================================
-- SQL Script to Remove Unused/Old Tables
-- Created: 2025-10-01
-- ============================================
-- IMPORTANT: Backup your database before running this script!
-- This will permanently delete old tables that are no longer used.
-- ============================================

-- Check if old tables exist before dropping
SELECT 'Checking for old tables...' as status;

-- Drop old unified tables (NOT USED - we use separate tables)
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `invoice_items`;

-- Drop any other legacy tables that might exist
DROP TABLE IF EXISTS `warehouse_stock`;
DROP TABLE IF EXISTS `van_stock`;

-- Show remaining tables
SELECT 'Cleanup complete! Remaining tables:' as status;
SHOW TABLES;

-- ============================================
-- Current Database Structure (Should remain):
-- ============================================
-- users
-- customers
-- employees
-- products
-- categories
-- vans
-- locations
-- stock (unified stock table with location_type and location_id)
-- stock_movements
-- sales_invoices (separate sales invoices)
-- sales_invoice_items
-- purchase_invoices (separate purchase invoices)
-- purchase_invoice_items
-- payments
-- transfers
-- transfer_items
-- ============================================
