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
