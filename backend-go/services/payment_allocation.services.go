package services

import (
	"errors"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type PaymentAllocationService struct {
	db *gorm.DB
}

func NewPaymentAllocationService(db *gorm.DB) *PaymentAllocationService {
	return &PaymentAllocationService{
		db: db,
	}
}

// AllocatePaymentFIFO allocates payment to unpaid invoices using FIFO (First In First Out) logic
func (s *PaymentAllocationService) AllocatePaymentFIFO(
	customerID *uint,
	vendorID *uint,
	invoiceType string,
	amount float64,
	paymentMethod string,
	paymentDate time.Time,
	referenceNumber *string,
	notes *string,
	createdBy uint,
) (*models.Payment, []models.PaymentAllocation, error) {

	if customerID == nil && vendorID == nil {
		return nil, nil, errors.New("either customer_id or vendor_id must be provided")
	}

	if invoiceType != "sales" && invoiceType != "purchase" {
		return nil, nil, errors.New("invoice_type must be 'sales' or 'purchase'")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get unpaid/partially paid invoices sorted by date (oldest first)
	var invoices []interface{}
	var err error

	if invoiceType == "sales" {
		var salesInvoices []models.SalesInvoice
		query := tx.Model(&models.SalesInvoice{}).
			Where("payment_status IN ?", []string{"unpaid", "partial"})

		if customerID != nil {
			query = query.Where("customer_id = ?", *customerID)
		}

		err = query.Order("created_at ASC").Find(&salesInvoices).Error
		if err != nil {
			tx.Rollback()
			return nil, nil, err
		}

		for i := range salesInvoices {
			invoices = append(invoices, &salesInvoices[i])
		}
	} else {
		var purchaseInvoices []models.PurchaseInvoice
		query := tx.Model(&models.PurchaseInvoice{}).
			Where("payment_status IN ?", []string{"unpaid", "partial"})

		if vendorID != nil {
			query = query.Where("vendor_id = ?", *vendorID)
		}

		err = query.Order("created_at ASC").Find(&purchaseInvoices).Error
		if err != nil {
			tx.Rollback()
			return nil, nil, err
		}

		for i := range purchaseInvoices {
			invoices = append(invoices, &purchaseInvoices[i])
		}
	}

	if len(invoices) == 0 {
		tx.Rollback()
		return nil, nil, errors.New("no unpaid invoices found")
	}

	// Create payment record (using first invoice as primary reference)
	var firstInvoiceID uint
	if invoiceType == "sales" {
		firstInvoiceID = invoices[0].(*models.SalesInvoice).ID
	} else {
		firstInvoiceID = invoices[0].(*models.PurchaseInvoice).ID
	}

	payment := models.Payment{
		InvoiceID:         firstInvoiceID,
		InvoiceType:       invoiceType,
		CustomerID:        customerID,
		VendorID:          vendorID,
		Amount:            amount,
		PaymentMethod:     paymentMethod,
		ReferenceNumber:   referenceNumber,
		Notes:             notes,
		AllocationType:    "multiple",
		TotalAllocated:    0,
		UnallocatedAmount: amount,
		CreatedBy:         createdBy,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		return nil, nil, err
	}

	// Allocate payment to invoices using FIFO
	// Use absolute value for allocation logic (handle negative amounts for purchases)
	remainingAmount := amount
	if remainingAmount < 0 {
		remainingAmount = -remainingAmount
	}
	var allocations []models.PaymentAllocation

	for _, inv := range invoices {
		if remainingAmount <= 0 {
			break
		}

		var invoiceID uint
		var totalAmount, paidAmount float64
		var currentStatus string

		if invoiceType == "sales" {
			salesInv := inv.(*models.SalesInvoice)
			invoiceID = salesInv.ID
			totalAmount = salesInv.TotalAmount
			paidAmount = salesInv.PaidAmount
			currentStatus = salesInv.PaymentStatus
		} else {
			purchaseInv := inv.(*models.PurchaseInvoice)
			invoiceID = purchaseInv.ID
			totalAmount = purchaseInv.TotalAmount
			paidAmount = purchaseInv.PaidAmount
			currentStatus = purchaseInv.PaymentStatus

			// Subtract approved credit notes from total amount
			var creditNoteTotal float64
			tx.Model(&models.CreditNote{}).
				Where("purchase_invoice_id = ? AND status = ?", invoiceID, "approved").
				Select("COALESCE(SUM(total_amount), 0)").
				Scan(&creditNoteTotal)
			totalAmount -= creditNoteTotal
		}

		// Skip if already paid
		if currentStatus == "paid" {
			continue
		}

		// Calculate amount due and round to 2 decimal places to avoid precision issues
		amountDue := totalAmount - paidAmount
		amountDue = float64(int(amountDue*100+0.5)) / 100 // Round to 2 decimals

		if amountDue <= 0 {
			continue
		}

		// Allocate amount (minimum of remaining payment and amount due)
		allocatedAmount := remainingAmount
		if allocatedAmount > amountDue {
			allocatedAmount = amountDue
		}
		// Round allocated amount to 2 decimals
		allocatedAmount = float64(int(allocatedAmount*100+0.5)) / 100

		// Update invoice
		newPaidAmount := paidAmount + allocatedAmount
		// Round to 2 decimals to avoid precision issues
		newPaidAmount = float64(int(newPaidAmount*100+0.5)) / 100

		newStatus := "partial"
		// Use tolerance for floating-point comparison (0.01 = 1 cent)
		// totalAmount already has credit notes subtracted for purchase invoices
		if newPaidAmount >= totalAmount-0.01 {
			newStatus = "paid"
			// Keep the actual paid amount, don't set to adjusted total
		}

		// Create allocation record with the invoice status after this allocation
		allocation := models.PaymentAllocation{
			PaymentID:       payment.ID,
			InvoiceID:       invoiceID,
			InvoiceType:     invoiceType,
			AllocatedAmount: allocatedAmount,
			InvoiceStatus:   newStatus,
			AllocationDate:  paymentDate,
		}

		if err := tx.Create(&allocation).Error; err != nil {
			tx.Rollback()
			return nil, nil, err
		}

		allocations = append(allocations, allocation)

		if invoiceType == "sales" {
			if err := tx.Model(&models.SalesInvoice{}).
				Where("id = ?", invoiceID).
				Updates(map[string]interface{}{
					"paid_amount":    newPaidAmount,
					"payment_status": newStatus,
				}).Error; err != nil {
				tx.Rollback()
				return nil, nil, err
			}
		} else {
			if err := tx.Model(&models.PurchaseInvoice{}).
				Where("id = ?", invoiceID).
				Updates(map[string]interface{}{
					"paid_amount":    newPaidAmount,
					"payment_status": newStatus,
				}).Error; err != nil {
				tx.Rollback()
				return nil, nil, err
			}
		}

		remainingAmount -= allocatedAmount
	}

	// Update payment with allocation totals
	// Use absolute value for calculations
	absAmount := amount
	if absAmount < 0 {
		absAmount = -absAmount
	}
	payment.TotalAllocated = absAmount - remainingAmount
	payment.UnallocatedAmount = remainingAmount

	if err := tx.Save(&payment).Error; err != nil {
		tx.Rollback()
		return nil, nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, nil, err
	}

	return &payment, allocations, nil
}

// GetPaymentAllocations retrieves all allocations for a payment
func (s *PaymentAllocationService) GetPaymentAllocations(paymentID uint) ([]models.PaymentAllocation, error) {
	var allocations []models.PaymentAllocation
	if err := s.db.Where("payment_id = ?", paymentID).Find(&allocations).Error; err != nil {
		return nil, err
	}
	return allocations, nil
}

// GetInvoiceAllocations retrieves all allocations for an invoice
func (s *PaymentAllocationService) GetInvoiceAllocations(invoiceID uint, invoiceType string) ([]models.PaymentAllocation, error) {
	var allocations []models.PaymentAllocation
	if err := s.db.Where("invoice_id = ? AND invoice_type = ?", invoiceID, invoiceType).
		Preload("Payment").
		Find(&allocations).Error; err != nil {
		return nil, err
	}
	return allocations, nil
}

// GetAllocationSummary provides a summary of payment allocation
func (s *PaymentAllocationService) GetAllocationSummary(paymentID uint) (map[string]interface{}, error) {
	var payment models.Payment
	if err := s.db.Preload("Allocations").First(&payment, paymentID).Error; err != nil {
		return nil, err
	}

	summary := map[string]interface{}{
		"payment_id":         payment.ID,
		"total_amount":       payment.Amount,
		"total_allocated":    payment.TotalAllocated,
		"unallocated_amount": payment.UnallocatedAmount,
		"allocation_type":    payment.AllocationType,
		"allocations_count":  len(payment.Allocations),
		"allocations":        payment.Allocations,
	}

	return summary, nil
}

// min returns the minimum of two float64 values
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
