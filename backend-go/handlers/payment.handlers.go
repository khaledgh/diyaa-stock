package handlers

import (
	"errors"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type PaymentService interface {
	GetALL(invoiceID string, limit int) ([]models.Payment, error)
	Create(payment models.Payment) (models.Payment, error)
	DeleteByInvoiceID(invoiceID uint) error
}

type CreditNoteServiceForPayment interface {
	GetApprovedCreditNoteTotal(purchaseInvoiceID uint) (float64, error)
}

type PaymentHandler struct {
	PaymentServices         PaymentService
	SalesInvoiceServices    SalesInvoiceService
	PurchaseInvoiceServices PurchaseInvoiceService
	CreditNoteServices      CreditNoteServiceForPayment
}

func NewPaymentHandler(ps PaymentService, sis SalesInvoiceService, pis PurchaseInvoiceService, cns CreditNoteServiceForPayment) *PaymentHandler {
	return &PaymentHandler{
		PaymentServices:         ps,
		SalesInvoiceServices:    sis,
		PurchaseInvoiceServices: pis,
		CreditNoteServices:      cns,
	}
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

	return ResponseSuccess(c, "Payment recorded successfully", createdPayment)
}
