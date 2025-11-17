-- Migration: Add Credit Notes and Payment Allocations
-- Date: 2024-11-17
-- Description: Adds tables for credit notes and payment allocation (FIFO) features

-- ============================================
-- Credit Notes Tables
-- ============================================

CREATE TABLE IF NOT EXISTS credit_notes (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_invoice_id BIGINT UNSIGNED NULL,
    vendor_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    credit_note_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    notes TEXT NULL,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_credit_note_number (credit_note_number),
    INDEX idx_status (status),
    INDEX idx_vendor (vendor_id),
    INDEX idx_location (location_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at),
    
    CONSTRAINT fk_credit_note_purchase_invoice 
        FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_credit_note_vendor 
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_note_location 
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_note_creator 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_credit_note_status 
        CHECK (status IN ('draft', 'approved', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credit_note_items (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    credit_note_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_credit_note (credit_note_id),
    INDEX idx_product (product_id),
    
    CONSTRAINT fk_credit_note_item_credit_note 
        FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_note_item_product 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_credit_note_item_quantity 
        CHECK (quantity > 0),
    CONSTRAINT chk_credit_note_item_unit_price 
        CHECK (unit_price >= 0),
    CONSTRAINT chk_credit_note_item_total 
        CHECK (total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Payment Allocation Tables
-- ============================================

-- Add new columns to existing payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS allocation_type VARCHAR(20) DEFAULT 'single' NOT NULL,
ADD COLUMN IF NOT EXISTS total_allocated DECIMAL(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS unallocated_amount DECIMAL(15,2) DEFAULT 0 NOT NULL,
ADD INDEX IF NOT EXISTS idx_allocation_type (allocation_type);

-- Add constraint for allocation_type
ALTER TABLE payments 
ADD CONSTRAINT chk_payment_allocation_type 
CHECK (allocation_type IN ('single', 'multiple'));

CREATE TABLE IF NOT EXISTS payment_allocations (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    payment_id BIGINT UNSIGNED NOT NULL,
    invoice_id BIGINT UNSIGNED NOT NULL,
    invoice_type VARCHAR(20) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_id (payment_id),
    INDEX idx_invoice (invoice_id, invoice_type),
    INDEX idx_allocation_date (allocation_date),
    
    CONSTRAINT fk_payment_allocation_payment 
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_allocation_invoice_type 
        CHECK (invoice_type IN ('sales', 'purchase')),
    CONSTRAINT chk_payment_allocation_amount 
        CHECK (allocated_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Additional indexes for better query performance
CREATE INDEX idx_credit_notes_vendor_status ON credit_notes(vendor_id, status);
CREATE INDEX idx_credit_notes_location_status ON credit_notes(location_id, status);
CREATE INDEX idx_payment_allocations_invoice_type ON payment_allocations(invoice_id, invoice_type, payment_id);

-- ============================================
-- Initial Data / Seed (Optional)
-- ============================================

-- You can add any initial data here if needed
-- For example, update existing payments to have default allocation values
UPDATE payments 
SET allocation_type = 'single',
    total_allocated = amount,
    unallocated_amount = 0
WHERE allocation_type IS NULL;

-- ============================================
-- Rollback Script (Keep for reference)
-- ============================================

/*
-- To rollback this migration, run:

DROP TABLE IF EXISTS credit_note_items;
DROP TABLE IF EXISTS credit_notes;
DROP TABLE IF EXISTS payment_allocations;

ALTER TABLE payments 
DROP COLUMN IF EXISTS allocation_type,
DROP COLUMN IF EXISTS total_allocated,
DROP COLUMN IF EXISTS unallocated_amount;
*/
