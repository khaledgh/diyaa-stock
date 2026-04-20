package handlers

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type PaymentService interface {
	GetALL(invoiceID string, limit int) ([]models.Payment, error)
	GetByID(id uint) (models.Payment, error)
	Create(payment models.Payment) (models.Payment, error)
	DeleteByInvoiceID(invoiceID uint, invoiceType string) error
}

type SalesInvoiceServiceForPayment interface {
	GetID(id string) (models.SalesInvoice, error)
	Update(invoice models.SalesInvoice) (models.SalesInvoice, error)
	Delete(id string, tx *gorm.DB) error
}

type PurchaseInvoiceServiceForPayment interface {
	GetID(id string) (models.PurchaseInvoice, error)
	Update(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
	Delete(id string, tx *gorm.DB) error
}

type CreditNoteServiceForPayment interface {
	GetApprovedCreditNoteTotal(purchaseInvoiceID uint) (float64, error)
}

type PaymentHandler struct {
	PaymentServices         PaymentService
	SalesInvoiceServices    SalesInvoiceServiceForPayment
	PurchaseInvoiceServices PurchaseInvoiceServiceForPayment
	CreditNoteServices      CreditNoteServiceForPayment
	DB                      *gorm.DB
}

func NewPaymentHandler(ps PaymentService, sis SalesInvoiceServiceForPayment, pis PurchaseInvoiceServiceForPayment, cns CreditNoteServiceForPayment, db ...*gorm.DB) *PaymentHandler {
	h := &PaymentHandler{
		PaymentServices:         ps,
		SalesInvoiceServices:    sis,
		PurchaseInvoiceServices: pis,
		CreditNoteServices:      cns,
	}
	if len(db) > 0 {
		h.DB = db[0]
	}
	return h
}

func (ph *PaymentHandler) GetAllHandler(c echo.Context) error {
	invoiceID := c.QueryParam("invoice_id")
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	payments, err := ph.PaymentServices.GetALL(invoiceID, limit)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, payments, "data")
}

func (ph *PaymentHandler) CreateHandler(c echo.Context) error {
	var req struct {
		InvoiceID       uint    `json:"invoice_id"`
		InvoiceType     string  `json:"invoice_type"`
		Amount          float64 `json:"amount"`
		PaymentMethod   string  `json:"payment_method"`
		ReferenceNumber *string `json:"reference_number"`
		Notes           *string `json:"notes"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	if req.Amount <= 0 {
		return ResponseError(c, errors.New("payment amount must be greater than zero"))
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get invoice and validate
	var totalAmount, paidAmount float64
	var customerID *uint
	var vendorID *uint

	if req.InvoiceType == "purchase" {
		invoice, err := ph.PurchaseInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))
		if err != nil {
			return ResponseError(c, errors.New("invoice not found"))
		}
		totalAmount = invoice.TotalAmount
		paidAmount = invoice.PaidAmount
		vendorID = invoice.VendorID

		// Subtract approved credit notes from total amount
		if ph.CreditNoteServices != nil {
			creditNoteTotal, _ := ph.CreditNoteServices.GetApprovedCreditNoteTotal(invoice.ID)
			totalAmount -= creditNoteTotal
		}
	} else {
		invoice, err := ph.SalesInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))
		if err != nil {
			return ResponseError(c, errors.New("invoice not found"))
		}
		totalAmount = invoice.TotalAmount
		paidAmount = invoice.PaidAmount
		if invoice.CustomerID != nil {
			customerID = invoice.CustomerID
		}
	}

	// Check if payment exceeds remaining amount
	remainingAmount := totalAmount - paidAmount
	if req.Amount > remainingAmount {
		return ResponseError(c, errors.New("payment amount exceeds remaining balance"))
	}

	// Create payment
	payment := models.Payment{
		InvoiceID:       req.InvoiceID,
		InvoiceType:     req.InvoiceType,
		CustomerID:      customerID,
		VendorID:        vendorID,
		Amount:          req.Amount,
		PaymentMethod:   req.PaymentMethod,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
		AllocationType:  "single",
		CreatedBy:       user.ID,
	}

	createdPayment, err := ph.PaymentServices.Create(payment)
	if err != nil {
		return ResponseError(c, err)
	}

	// Update invoice payment status
	newPaidAmount := paidAmount + req.Amount

	if req.InvoiceType == "purchase" {
		// Update purchase invoice
		invoice, _ := ph.PurchaseInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))

		// Use tolerance for floating-point comparison (0.01 = 1 cent)
		// totalAmount already has credit notes subtracted, so we compare against that
		if newPaidAmount >= totalAmount-0.01 {
			invoice.PaymentStatus = "paid"
			// Store actual paid amount, not the adjusted total
			invoice.PaidAmount = newPaidAmount
		} else if newPaidAmount > 0 {
			invoice.PaymentStatus = "partial"
			invoice.PaidAmount = newPaidAmount
		} else {
			invoice.PaymentStatus = "unpaid"
			invoice.PaidAmount = newPaidAmount
		}

		ph.PurchaseInvoiceServices.Update(invoice)
	} else {
		// Update sales invoice
		invoice, _ := ph.SalesInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))

		// Use tolerance for floating-point comparison (0.01 = 1 cent)
		if newPaidAmount >= totalAmount-0.01 {
			invoice.PaymentStatus = "paid"
			invoice.PaidAmount = totalAmount // Set to exact amount to avoid precision issues
		} else if newPaidAmount > 0 {
			invoice.PaymentStatus = "partial"
			invoice.PaidAmount = newPaidAmount
		} else {
			invoice.PaymentStatus = "unpaid"
			invoice.PaidAmount = newPaidAmount
		}

		ph.SalesInvoiceServices.Update(invoice)
	}

	// Update customer/vendor balance ledger (payment reduces outstanding balance)
	if ph.DB != nil && req.Amount > 0 {
		if customerID != nil && *customerID > 0 {
			ph.DB.Model(&models.Customer{}).Where("id = ?", *customerID).
				Update("balance", gorm.Expr("CASE WHEN balance - ? < 0 THEN 0 ELSE balance - ? END", req.Amount, req.Amount))
		}
		if vendorID != nil && *vendorID > 0 {
			ph.DB.Model(&models.Vendor{}).Where("id = ?", *vendorID).
				Update("balance", gorm.Expr("CASE WHEN balance - ? < 0 THEN 0 ELSE balance - ? END", req.Amount, req.Amount))
		}
	}

	return ResponseSuccess(c, "Payment recorded successfully", createdPayment)
}

// ReversePaymentHandler creates a reversal (negative) payment record and restores invoice + balance
func (ph *PaymentHandler) ReversePaymentHandler(c echo.Context) error {
	paymentIDStr := c.Param("id")
	paymentIDUint, err := strconv.ParseUint(paymentIDStr, 10, 32)
	if err != nil {
		return ResponseError(c, errors.New("invalid payment ID"))
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get original payment
	original, err := ph.PaymentServices.GetByID(uint(paymentIDUint))
	if err != nil {
		return ResponseError(c, fmt.Errorf("payment not found: %w", err))
	}

	// Create reversal payment (negative amount)
	reversalNotes := fmt.Sprintf("Reversal of payment #%d", original.ID)
	reversal := models.Payment{
		InvoiceID:       original.InvoiceID,
		InvoiceType:     original.InvoiceType,
		CustomerID:      original.CustomerID,
		VendorID:        original.VendorID,
		Amount:          -original.Amount,
		PaymentMethod:   original.PaymentMethod,
		ReferenceNumber: original.ReferenceNumber,
		Notes:           &reversalNotes,
		AllocationType:  "single",
		CreatedBy:       user.ID,
	}

	createdReversal, err := ph.PaymentServices.Create(reversal)
	if err != nil {
		return ResponseError(c, err)
	}

	// Restore invoice paid_amount and payment_status
	invoiceIDStr := strconv.Itoa(int(original.InvoiceID))
	if original.InvoiceType == "purchase" {
		invoice, err := ph.PurchaseInvoiceServices.GetID(invoiceIDStr)
		if err == nil {
			newPaidAmount := invoice.PaidAmount - original.Amount
			if newPaidAmount < 0 {
				newPaidAmount = 0
			}
			invoice.PaidAmount = newPaidAmount
			if newPaidAmount <= 0.01 {
				invoice.PaymentStatus = "unpaid"
			} else if newPaidAmount >= invoice.TotalAmount-0.01 {
				invoice.PaymentStatus = "paid"
			} else {
				invoice.PaymentStatus = "partial"
			}
			ph.PurchaseInvoiceServices.Update(invoice)
		}
	} else {
		invoice, err := ph.SalesInvoiceServices.GetID(invoiceIDStr)
		if err == nil {
			newPaidAmount := invoice.PaidAmount - original.Amount
			if newPaidAmount < 0 {
				newPaidAmount = 0
			}
			invoice.PaidAmount = newPaidAmount
			if newPaidAmount <= 0.01 {
				invoice.PaymentStatus = "unpaid"
			} else if newPaidAmount >= invoice.TotalAmount-0.01 {
				invoice.PaymentStatus = "paid"
			} else {
				invoice.PaymentStatus = "partial"
			}
			ph.SalesInvoiceServices.Update(invoice)
		}
	}

	// Restore customer/vendor balance (add back the reversed amount)
	if ph.DB != nil {
		if original.CustomerID != nil && *original.CustomerID > 0 {
			ph.DB.Model(&models.Customer{}).Where("id = ?", *original.CustomerID).
				Update("balance", gorm.Expr("balance + ?", original.Amount))
		}
		if original.VendorID != nil && *original.VendorID > 0 {
			ph.DB.Model(&models.Vendor{}).Where("id = ?", *original.VendorID).
				Update("balance", gorm.Expr("balance + ?", original.Amount))
		}
	}

	return ResponseSuccess(c, "Payment reversed successfully", createdReversal)
}
