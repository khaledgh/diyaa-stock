package handlers

import (
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type SalesInvoiceService interface {
	GetALL(filters map[string]string, limit, offset int) ([]models.SalesInvoice, int64, error)
	GetID(id string) (models.SalesInvoice, error)
	GetCount() (int64, error)
	Create(invoice models.SalesInvoice) (models.SalesInvoice, error)
	Update(invoice models.SalesInvoice) (models.SalesInvoice, error)
}

type PurchaseInvoiceService interface {
	GetALL(filters map[string]string, limit, offset int) ([]models.PurchaseInvoice, int64, error)
	GetID(id string) (models.PurchaseInvoice, error)
	GetCount() (int64, error)
	Create(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
	Update(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
}

type InvoiceHandler struct {
	SalesInvoiceServices    SalesInvoiceService
	PurchaseInvoiceServices PurchaseInvoiceService
	StockServices           StockService
	PaymentServices         PaymentService
}

func NewInvoiceHandler(sis SalesInvoiceService, pis PurchaseInvoiceService, ss StockService, ps PaymentService) *InvoiceHandler {
	return &InvoiceHandler{
		SalesInvoiceServices:    sis,
		PurchaseInvoiceServices: pis,
		StockServices:           ss,
		PaymentServices:         ps,
	}
}

func (ih *InvoiceHandler) StatsHandler(c echo.Context) error {
	salesCount, _ := ih.SalesInvoiceServices.GetCount()
	purchaseCount, _ := ih.PurchaseInvoiceServices.GetCount()
	
	stats := map[string]interface{}{
		"sales_count":    salesCount,
		"purchase_count": purchaseCount,
	}
	
	return ResponseOK(c, stats, "data")
}

func (ih *InvoiceHandler) GetAllHandler(c echo.Context) error {
	invoiceType := c.QueryParam("invoice_type")
	if invoiceType == "" {
		invoiceType = "sales"
	}
	
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 10
	}
	
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	
	filters := map[string]string{
		"search":         c.QueryParam("search"),
		"payment_status": c.QueryParam("payment_status"),
		"customer_id":    c.QueryParam("customer_id"),
		"vendor_id":      c.QueryParam("vendor_id"),
		"location_id":    c.QueryParam("location_id"),
		"from_date":      c.QueryParam("from_date"),
		"to_date":        c.QueryParam("to_date"),
	}
	
	if invoiceType == "purchase" {
		invoices, total, err := ih.PurchaseInvoiceServices.GetALL(filters, limit, offset)
		if err != nil {
			return ResponseError(c, err)
		}
		
		page := (offset / limit) + 1
		totalPages := (int(total) + limit - 1) / limit
		
		response := map[string]interface{}{
			"data": invoices,
			"pagination": map[string]interface{}{
				"total":  total,
				"limit":  limit,
				"offset": offset,
				"page":   page,
				"pages":  totalPages,
			},
		}
		return ResponseOK(c, response, "data")
	}
	
	// Sales invoices
	invoices, total, err := ih.SalesInvoiceServices.GetALL(filters, limit, offset)
	if err != nil {
		return ResponseError(c, err)
	}
	
	page := (offset / limit) + 1
	totalPages := (int(total) + limit - 1) / limit
	
	response := map[string]interface{}{
		"data": invoices,
		"pagination": map[string]interface{}{
			"total":  total,
			"limit":  limit,
			"offset": offset,
			"page":   page,
			"pages":  totalPages,
		},
	}
	return ResponseOK(c, response, "invoices")
}

func (ih *InvoiceHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	invoiceType := c.QueryParam("invoice_type")
	if invoiceType == "" {
		invoiceType = "sales"
	}
	
	if invoiceType == "purchase" {
		invoice, err := ih.PurchaseInvoiceServices.GetID(id)
		if err != nil {
			return ResponseError(c, err)
		}
		return ResponseOK(c, invoice, "data")
	}
	
	invoice, err := ih.SalesInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, invoice, "data")
}

func (ih *InvoiceHandler) CreatePurchaseHandler(c echo.Context) error {
	var req struct {
		LocationID    uint    `json:"location_id"`
		VendorID      *uint   `json:"vendor_id"`
		PaymentMethod *string `json:"payment_method"`
		PaidAmount    float64 `json:"paid_amount"`
		Notes         *string `json:"notes"`
		Items         []struct {
			ProductID uint    `json:"product_id"`
			Quantity  int     `json:"quantity"`
			UnitPrice float64 `json:"unit_price"`
		} `json:"items"`
	}
	
	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}
	
	if len(req.Items) == 0 {
		return ResponseError(c, errors.New("invoice must have at least one item"))
	}
	
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Calculate total
	var totalAmount float64
	var items []models.PurchaseInvoiceItem
	for _, item := range req.Items {
		total := float64(item.Quantity) * item.UnitPrice
		totalAmount += total
		items = append(items, models.PurchaseInvoiceItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
			Total:     total,
		})
	}
	
	// Determine payment status
	paymentStatus := "unpaid"
	if req.PaidAmount >= totalAmount {
		paymentStatus = "paid"
	} else if req.PaidAmount > 0 {
		paymentStatus = "partial"
	}
	
	invoice := models.PurchaseInvoice{
		VendorID:      req.VendorID,
		LocationID:    req.LocationID,
		TotalAmount:   totalAmount,
		PaidAmount:    req.PaidAmount,
		PaymentStatus: paymentStatus,
		PaymentMethod: req.PaymentMethod,
		Notes:         req.Notes,
		CreatedBy:     user.ID,
		Items:         items,
	}
	
	createdInvoice, err := ih.PurchaseInvoiceServices.Create(invoice)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Get correct location type and ID
	locationType, locationID := ih.StockServices.GetLocationTypeAndID(req.LocationID)
	
	// Update stock (add to location)
	for _, item := range req.Items {
		if err := ih.StockServices.UpdateStock(item.ProductID, locationType, locationID, item.Quantity); err != nil {
			log.Printf("[PURCHASE INVOICE] Error adding stock: %v", err)
			return ResponseError(c, err)
		}
		
		// Create stock movement record
		notes := fmt.Sprintf("Purchase Invoice #%d", createdInvoice.ID)
		if err := ih.StockServices.CreateMovement(
			item.ProductID,
			"purchase",
			item.Quantity,
			"", // No source for purchases
			0,  // No source ID for purchases
			locationType,
			locationID,
			notes,
			user.ID,
		); err != nil {
			log.Printf("[PURCHASE INVOICE] Error creating movement record: %v", err)
			// Don't fail the invoice if movement recording fails
		}
	}
	
	// Create payment record if there's a paid amount
	if req.PaidAmount > 0 && req.PaymentMethod != nil {
		payment := models.Payment{
			InvoiceID:     createdInvoice.ID,
			Amount:        req.PaidAmount,
			PaymentMethod: *req.PaymentMethod,
			CreatedBy:     user.ID,
		}
		
		if _, err := ih.PaymentServices.Create(payment); err != nil {
			log.Printf("[PURCHASE INVOICE] Error creating payment record: %v", err)
			// Don't fail the invoice if payment recording fails
		} else {
			log.Printf("[PURCHASE INVOICE] Payment record created for invoice #%d, amount: %.2f", createdInvoice.ID, req.PaidAmount)
		}
	}
	
	log.Printf("[PURCHASE INVOICE] Invoice #%d created successfully with %d items", createdInvoice.ID, len(req.Items))
	return ResponseSuccess(c, "Purchase invoice created successfully", createdInvoice)
}

func (ih *InvoiceHandler) CreateSalesHandler(c echo.Context) error {
	var req struct {
		CustomerID    *uint   `json:"customer_id"`
		LocationID    uint    `json:"location_id"`
		PaymentMethod *string `json:"payment_method"`
		PaidAmount    float64 `json:"paid_amount"`
		Notes         *string `json:"notes"`
		Items         []struct {
			ProductID uint    `json:"product_id"`
			Quantity  int     `json:"quantity"`
			UnitPrice float64 `json:"unit_price"`
		} `json:"items"`
	}
	
	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}
	
	if len(req.Items) == 0 {
		return ResponseError(c, errors.New("invoice must have at least one item"))
	}
	
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Calculate total
	var totalAmount float64
	var items []models.SalesInvoiceItem
	for _, item := range req.Items {
		total := float64(item.Quantity) * item.UnitPrice
		totalAmount += total
		items = append(items, models.SalesInvoiceItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
			Total:     total,
		})
	}
	
	// Determine payment status
	paymentStatus := "unpaid"
	if req.PaidAmount >= totalAmount {
		paymentStatus = "paid"
	} else if req.PaidAmount > 0 {
		paymentStatus = "partial"
	}
	
	invoice := models.SalesInvoice{
		CustomerID:    req.CustomerID,
		LocationID:    req.LocationID,
		TotalAmount:   totalAmount,
		PaidAmount:    req.PaidAmount,
		PaymentStatus: paymentStatus,
		PaymentMethod: req.PaymentMethod,
		Notes:         req.Notes,
		CreatedBy:     user.ID,
		Items:         items,
	}
	
	createdInvoice, err := ih.SalesInvoiceServices.Create(invoice)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Get correct location type and ID
	locationType, locationID := ih.StockServices.GetLocationTypeAndID(req.LocationID)
	
	// Update stock (reduce from location)
	for _, item := range req.Items {
		if err := ih.StockServices.UpdateStock(item.ProductID, locationType, locationID, -item.Quantity); err != nil {
			log.Printf("[SALES INVOICE] Error reducing stock: %v", err)
			return ResponseError(c, err)
		}
		
		// Create stock movement record
		notes := fmt.Sprintf("Sales Invoice #%d", createdInvoice.ID)
		if err := ih.StockServices.CreateMovement(
			item.ProductID,
			"sale",
			item.Quantity,
			locationType,
			locationID,
			"", // No destination for sales
			0,  // No destination ID for sales
			notes,
			user.ID,
		); err != nil {
			log.Printf("[SALES INVOICE] Error creating movement record: %v", err)
			// Don't fail the invoice if movement recording fails
		}
	}
	
	// Create payment record if there's a paid amount
	if req.PaidAmount > 0 && req.PaymentMethod != nil {
		payment := models.Payment{
			InvoiceID:     createdInvoice.ID,
			Amount:        req.PaidAmount,
			PaymentMethod: *req.PaymentMethod,
			CreatedBy:     user.ID,
		}
		
		if _, err := ih.PaymentServices.Create(payment); err != nil {
			log.Printf("[SALES INVOICE] Error creating payment record: %v", err)
			// Don't fail the invoice if payment recording fails
		} else {
			log.Printf("[SALES INVOICE] Payment record created for invoice #%d, amount: %.2f", createdInvoice.ID, req.PaidAmount)
		}
	}
	
	log.Printf("[SALES INVOICE] Invoice #%d created successfully with %d items", createdInvoice.ID, len(req.Items))
	return ResponseSuccess(c, "Sales invoice created successfully", createdInvoice)
}
