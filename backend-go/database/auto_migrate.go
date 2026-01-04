package database

import (
	"log"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

// AutoMigrate runs automatic migrations for all models
func AutoMigrate(db *gorm.DB) error {
	log.Println("Starting automatic database migration...")

	// List of all models to migrate
	err := db.AutoMigrate(
		// User and Auth
		&models.User{},

		// Products
		&models.Product{},
		&models.Category{},
		&models.ProductType{},
		&models.ProductBrand{},

		// Locations and Vans
		&models.Location{},
		&models.Van{},

		// Customers and Vendors
		&models.Customer{},
		&models.Vendor{},

		// Stock
		&models.Stock{},
		&models.StockMovement{},

		// Invoices
		&models.SalesInvoice{},
		&models.SalesInvoiceItem{},
		&models.PurchaseInvoice{},
		&models.PurchaseInvoiceItem{},

		// Payments and Allocations
		&models.Payment{},
		&models.PaymentAllocation{},

		// Credit Notes
		&models.CreditNote{},
		&models.CreditNoteItem{},

		// Transfers
		&models.Transfer{},
		&models.TransferItem{},

		// Expenses
		&models.Expense{},
		&models.ExpenseCategory{},
	)

	if err != nil {
		log.Printf("Error during migration: %v", err)
		return err
	}

	// Fix floating-point precision issues in existing invoices
	log.Println("Fixing floating-point precision issues in invoices...")

	// Fix purchase invoices where paid amount is within 1 cent of total
	result := db.Exec(`
		UPDATE purchase_invoices 
		SET 
			paid_amount = total_amount,
			payment_status = 'paid'
		WHERE 
			payment_status = 'partial'
			AND paid_amount >= (total_amount - 0.01)
			AND paid_amount < total_amount
	`)
	if result.Error != nil {
		log.Printf("Warning: Could not fix purchase invoices precision: %v", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("Fixed %d purchase invoices with precision issues", result.RowsAffected)
	}

	// Fix sales invoices where paid amount is within 1 cent of total
	result = db.Exec(`
		UPDATE sales_invoices 
		SET 
			paid_amount = total_amount,
			payment_status = 'paid'
		WHERE 
			payment_status = 'partial'
			AND paid_amount >= (total_amount - 0.01)
			AND paid_amount < total_amount
	`)
	if result.Error != nil {
		log.Printf("Warning: Could not fix sales invoices precision: %v", result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("Fixed %d sales invoices with precision issues", result.RowsAffected)
	}

	log.Println("Database migration completed successfully!")

	// Run custom SQL migrations after GORM migration
	log.Println("Running custom SQL migrations...")

	// Check if invoice_date column exists
	var columnExists int64
	checkColumnSQL := `
		SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'purchase_invoices' 
		AND COLUMN_NAME = 'invoice_date'
	`
	db.Raw(checkColumnSQL).Scan(&columnExists)

	if columnExists == 0 {
		// Add the column if it doesn't exist
		addColumnSQL := `ALTER TABLE purchase_invoices ADD COLUMN invoice_date DATE NULL`
		result = db.Exec(addColumnSQL)
		if result.Error != nil {
			log.Printf("Warning: Could not add invoice_date column: %v", result.Error)
		} else {
			log.Println("Added invoice_date column")
		}
	} else {
		log.Println("invoice_date column already exists")
	}

	// Update existing records to use created_at as invoice_date if invoice_date is null or zero
	updateSQL := `
		UPDATE purchase_invoices
		SET invoice_date = DATE(created_at)
		WHERE invoice_date IS NULL OR invoice_date = '0000-00-00'
	`
	result = db.Exec(updateSQL)
	if result.Error != nil {
		log.Printf("Warning: Could not update invoice_date for existing records: %v", result.Error)
	} else {
		log.Printf("Updated invoice_date for %d existing records", result.RowsAffected)
	}

	log.Println("Invoice date migration completed successfully!")

	return nil
}

// MigrateWithData runs migrations and seeds initial data if needed
func MigrateWithData(db *gorm.DB) error {
	// Run auto migration first
	if err := AutoMigrate(db); err != nil {
		return err
	}

	// Add any initial data seeding here if needed
	log.Println("Checking for initial data...")

	// Example: Create default admin user if none exists
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		log.Println("No users found. You may want to create an admin user.")
		// Add admin user creation logic here if needed
	}

	return nil
}
