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
}

type PaymentHandler struct {
	PaymentServices         PaymentService
	SalesInvoiceServices    SalesInvoiceService
	PurchaseInvoiceServices PurchaseInvoiceService
}

func NewPaymentHandler(ps PaymentService, sis SalesInvoiceService, pis PurchaseInvoiceService) *PaymentHandler {
	return &PaymentHandler{
		PaymentServices:         ps,
		SalesInvoiceServices:    sis,
		PurchaseInvoiceServices: pis,
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
		InvoiceID     uint    `json:"invoice_id"`
		InvoiceType   string  `json:"invoice_type"`
		Amount        float64 `json:"amount"`
		PaymentMethod string  `json:"payment_method"`
		ReferenceNumber *string `json:"reference_number"`
		Notes         *string `json:"notes"`
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
	
	if req.InvoiceType == "purchase" {
		invoice, err := ph.PurchaseInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))
		if err != nil {
			return ResponseError(c, errors.New("invoice not found"))
		}
		totalAmount = invoice.TotalAmount
		paidAmount = invoice.PaidAmount
	} else {
		invoice, err := ph.SalesInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))
		if err != nil {
			return ResponseError(c, errors.New("invoice not found"))
		}
		totalAmount = invoice.TotalAmount
		paidAmount = invoice.PaidAmount
	}
	
	// Check if payment exceeds remaining amount
	remainingAmount := totalAmount - paidAmount
	if req.Amount > remainingAmount {
		return ResponseError(c, errors.New("payment amount exceeds remaining balance"))
	}
	
	// Create payment
	payment := models.Payment{
		InvoiceID:       req.InvoiceID,
		Amount:          req.Amount,
		PaymentMethod:   req.PaymentMethod,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
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
		invoice.PaidAmount = newPaidAmount
		
		if newPaidAmount >= totalAmount {
			invoice.PaymentStatus = "paid"
		} else if newPaidAmount > 0 {
			invoice.PaymentStatus = "partial"
		} else {
			invoice.PaymentStatus = "unpaid"
		}
		
		ph.PurchaseInvoiceServices.Update(invoice)
	} else {
		// Update sales invoice
		invoice, _ := ph.SalesInvoiceServices.GetID(strconv.Itoa(int(req.InvoiceID)))
		invoice.PaidAmount = newPaidAmount
		
		if newPaidAmount >= totalAmount {
			invoice.PaymentStatus = "paid"
		} else if newPaidAmount > 0 {
			invoice.PaymentStatus = "partial"
		} else {
			invoice.PaymentStatus = "unpaid"
		}
		
		ph.SalesInvoiceServices.Update(invoice)
	}
	
	return ResponseSuccess(c, "Payment recorded successfully", createdPayment)
}
