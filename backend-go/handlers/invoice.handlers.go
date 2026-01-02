package handlers

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type SalesInvoiceService interface {
	GetALL(filters map[string]string, limit, offset int) ([]models.SalesInvoice, int64, error)
	GetID(id string) (models.SalesInvoice, error)
	GetCount() (int64, error)
	Create(invoice models.SalesInvoice) (models.SalesInvoice, error)
	Update(invoice models.SalesInvoice) (models.SalesInvoice, error)
	UpdateItem(itemID uint, productID uint, quantity float64, unitPrice, discountPercent float64) error
	AddItem(invoiceID uint, productID uint, quantity float64, unitPrice, discountPercent float64) error
	RecalculateTotals(invoiceID uint) error
	Delete(id string) error
}

type PurchaseInvoiceService interface {
	GetALL(filters map[string]string, limit, offset int) ([]models.PurchaseInvoice, int64, error)
	GetID(id string) (models.PurchaseInvoice, error)
	GetCount() (int64, error)
	Create(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
	Update(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
	UpdateItem(itemID uint, productID uint, quantity float64, unitPrice, discountPercent float64) error
	AddItem(invoiceID uint, productID uint, quantity float64, unitPrice, discountPercent float64) error
	RecalculateTotals(invoiceID uint) error
	Delete(id string) error
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

func (ih *InvoiceHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	invoiceType := c.QueryParam("invoice_type")
	if invoiceType == "" {
		invoiceType = "sales"
	}

	if invoiceType == "purchase" {
		var req struct {
			InvoiceDate *string `json:"invoice_date"`
			Notes       *string `json:"notes"`
			VendorID    *uint   `json:"vendor_id"`
		}

		if err := c.Bind(&req); err != nil {
			return ResponseError(c, err)
		}

		// Get existing invoice
		invoice, err := ih.PurchaseInvoiceServices.GetID(id)
		if err != nil {
			return ResponseError(c, err)
		}

		// Update only provided fields
		if req.InvoiceDate != nil && *req.InvoiceDate != "" {
			// Try parsing as date-only first (YYYY-MM-DD)
			parsedDate, err := time.Parse("2006-01-02", *req.InvoiceDate)
			if err != nil {
				// Try parsing as full timestamp
				parsedDate, err = time.Parse(time.RFC3339, *req.InvoiceDate)
				if err != nil {
					return ResponseError(c, fmt.Errorf("invalid date format: %s", *req.InvoiceDate))
				}
			}
			invoice.InvoiceDate = parsedDate
		}
		if req.Notes != nil {
			invoice.Notes = req.Notes
		}
		// VendorID can be set to null (to remove vendor) or to a valid vendor ID
		invoice.VendorID = req.VendorID

		updatedInvoice, err := ih.PurchaseInvoiceServices.Update(invoice)
		if err != nil {
			return ResponseError(c, err)
		}

		return ResponseSuccess(c, "Purchase invoice updated successfully", updatedInvoice)
	}

	// Sales invoice update (similar pattern)
	var req struct {
		Notes *string `json:"notes"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Get existing invoice
	invoice, err := ih.SalesInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Update only provided fields
	if req.Notes != nil {
		invoice.Notes = req.Notes
	}

	updatedInvoice, err := ih.SalesInvoiceServices.Update(invoice)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "Sales invoice updated successfully", updatedInvoice)
}

func (ih *InvoiceHandler) CreatePurchaseHandler(c echo.Context) error {
	var req struct {
		LocationID    uint    `json:"location_id"`
		VendorID      *uint   `json:"vendor_id"`
		InvoiceDate   string  `json:"invoice_date"`
		PaymentMethod *string `json:"payment_method"`
		PaidAmount    float64 `json:"paid_amount"`
		Notes         *string `json:"notes"`
		Items         []struct {
			ProductID       uint    `json:"product_id"`
			Quantity        float64 `json:"quantity"`
			UnitPrice       float64 `json:"unit_price"`
			DiscountPercent float64 `json:"discount_percent"`
		} `json:"items"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Parse invoice date
	var invoiceDate time.Time
	if req.InvoiceDate != "" {
		var err error
		// Try parsing as date-only first (YYYY-MM-DD)
		invoiceDate, err = time.Parse("2006-01-02", req.InvoiceDate)
		if err != nil {
			// Try parsing as full timestamp
			invoiceDate, err = time.Parse(time.RFC3339, req.InvoiceDate)
			if err != nil {
				// Default to current time if parsing fails
				invoiceDate = time.Now()
			}
		}
	} else {
		invoiceDate = time.Now()
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
		subtotal := float64(item.Quantity) * item.UnitPrice
		discountAmount := subtotal * item.DiscountPercent / 100
		total := subtotal - discountAmount
		totalAmount += total
		items = append(items, models.PurchaseInvoiceItem{
			ProductID:       item.ProductID,
			Quantity:        item.Quantity,
			UnitPrice:       item.UnitPrice,
			DiscountPercent: item.DiscountPercent,
			Total:           total,
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
		InvoiceDate:   invoiceDate,
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
			ProductID       uint    `json:"product_id"`
			Quantity        float64 `json:"quantity"`
			UnitPrice       float64 `json:"unit_price"`
			DiscountPercent float64 `json:"discount_percent"`
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
		subtotal := float64(item.Quantity) * item.UnitPrice
		discountAmount := subtotal * item.DiscountPercent / 100
		total := subtotal - discountAmount
		totalAmount += total
		items = append(items, models.SalesInvoiceItem{
			ProductID:       item.ProductID,
			Quantity:        item.Quantity,
			UnitPrice:       item.UnitPrice,
			DiscountPercent: item.DiscountPercent,
			Total:           total,
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

	// Validate stock availability before creating sales invoice
	for _, item := range req.Items {
		currentStock, err := ih.StockServices.GetProductStock(item.ProductID, locationType, locationID)
		if err != nil {
			// Handle case where no stock record exists
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: no stock available", item.ProductID))
			}
			return ResponseError(c, err)
		}

		// Use a small epsilon to handle floating point precision issues
		if item.Quantity > currentStock.Quantity+0.00001 {
			return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: available %.2f, required %.2f", item.ProductID, currentStock.Quantity, item.Quantity))
		}
	}

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

// UpdateSalesInvoiceItem updates a single item in a sales invoice
func (ih *InvoiceHandler) UpdateSalesInvoiceItem(c echo.Context) error {
	id := c.Param("id")
	itemID := c.Param("item_id")

	var req struct {
		ProductID       uint    `json:"product_id"`
		Quantity        float64 `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		DiscountPercent float64 `json:"discount_percent"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get the invoice and item
	invoice, err := ih.SalesInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	var itemToUpdate *models.SalesInvoiceItem
	for i := range invoice.Items {
		if fmt.Sprintf("%d", invoice.Items[i].ID) == itemID {
			itemToUpdate = &invoice.Items[i]
			break
		}
	}

	if itemToUpdate == nil {
		return ResponseError(c, errors.New("item not found"))
	}

	// Calculate quantity difference BEFORE updating the item
	oldQuantity := itemToUpdate.Quantity
	oldProductID := itemToUpdate.ProductID
	quantityDiff := req.Quantity - oldQuantity
	productChanged := req.ProductID != oldProductID

	// Update the item using the service method
	if err := ih.SalesInvoiceServices.UpdateItem(itemToUpdate.ID, req.ProductID, req.Quantity, req.UnitPrice, req.DiscountPercent); err != nil {
		return ResponseError(c, err)
	}

	// Recalculate invoice totals
	if err := ih.SalesInvoiceServices.RecalculateTotals(invoice.ID); err != nil {
		return ResponseError(c, err)
	}

	// Get updated invoice
	updatedInvoice, err := ih.SalesInvoiceServices.GetID(fmt.Sprintf("%d", invoice.ID))
	if err != nil {
		return ResponseError(c, err)
	}

	// Adjust stock based on quantity and product changes
	if quantityDiff != 0 || productChanged {
		locationType, locationID := ih.StockServices.GetLocationTypeAndID(invoice.LocationID)

		// Validate stock availability before making changes
		if productChanged {
			// For new product, check if we have enough stock
			currentStock, err := ih.StockServices.GetProductStock(req.ProductID, locationType, locationID)
			if err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return ResponseError(c, err)
				}
				// No stock record exists, so no stock available
				return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: no stock available", req.ProductID))
			}

			if currentStock.Quantity < req.Quantity {
				return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: available %.2f, required %.2f", req.ProductID, currentStock.Quantity, req.Quantity))
			}
		} else if quantityDiff > 0 {
			// For same product with increased quantity, check if we have enough additional stock
			currentStock, err := ih.StockServices.GetProductStock(req.ProductID, locationType, locationID)
			if err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return ResponseError(c, err)
				}
				// No stock record exists, so no stock available
				return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: no stock available", req.ProductID))
			}

			if currentStock.Quantity < quantityDiff {
				return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: available %.2f, additional required %.2f", req.ProductID, currentStock.Quantity, quantityDiff))
			}
		}

		if productChanged {
			// If product changed, adjust both old and new products
			// Return old quantity to old product
			if err := ih.StockServices.UpdateStock(oldProductID, locationType, locationID, oldQuantity); err != nil {
				log.Printf("[UPDATE SALES ITEM] Error returning stock to old product: %v", err)
			}
			// Remove new quantity from new product
			if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, -req.Quantity); err != nil {
				log.Printf("[UPDATE SALES ITEM] Error adjusting stock for new product: %v", err)
			}
		} else {
			// Same product, just adjust quantity difference
			if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, -quantityDiff); err != nil {
				log.Printf("[UPDATE SALES ITEM] Error adjusting stock: %v", err)
			}
		}

		// Create stock movement record
		notes := fmt.Sprintf("Updated sales invoice #%s item", invoice.ID)
		var movementQuantity float64
		if productChanged {
			movementQuantity = req.Quantity
		} else {
			movementQuantity = quantityDiff
		}
		if err := ih.StockServices.CreateMovement(
			req.ProductID,
			"sale",
			movementQuantity,
			locationType,
			locationID,
			"", // No destination for sales
			0,  // No destination ID for sales
			notes,
			user.ID,
		); err != nil {
			log.Printf("[UPDATE SALES ITEM] Error creating movement record: %v", err)
		}
	}

	log.Printf("[UPDATE SALES ITEM] Item %s updated in invoice #%s, quantity changed from %.2f to %.2f", itemID, id, oldQuantity, req.Quantity)
	return ResponseSuccess(c, "Sales invoice item updated successfully", updatedInvoice)
}

// UpdatePurchaseInvoiceItem updates a single item in a purchase invoice
func (ih *InvoiceHandler) UpdatePurchaseInvoiceItem(c echo.Context) error {
	id := c.Param("id")
	itemID := c.Param("item_id")

	var req struct {
		ProductID       uint    `json:"product_id"`
		Quantity        float64 `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		DiscountPercent float64 `json:"discount_percent"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get the invoice and item
	invoice, err := ih.PurchaseInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	var itemToUpdate *models.PurchaseInvoiceItem
	for i := range invoice.Items {
		if fmt.Sprintf("%d", invoice.Items[i].ID) == itemID {
			itemToUpdate = &invoice.Items[i]
			break
		}
	}

	if itemToUpdate == nil {
		return ResponseError(c, errors.New("item not found"))
	}

	// Calculate quantity difference BEFORE updating the item
	oldQuantity := itemToUpdate.Quantity
	oldProductID := itemToUpdate.ProductID
	quantityDiff := req.Quantity - oldQuantity
	productChanged := req.ProductID != oldProductID

	// Update the item using the service method
	if err := ih.PurchaseInvoiceServices.UpdateItem(itemToUpdate.ID, req.ProductID, req.Quantity, req.UnitPrice, req.DiscountPercent); err != nil {
		return ResponseError(c, err)
	}

	// Recalculate invoice totals
	if err := ih.PurchaseInvoiceServices.RecalculateTotals(invoice.ID); err != nil {
		return ResponseError(c, err)
	}

	// Get updated invoice
	updatedInvoice, err := ih.PurchaseInvoiceServices.GetID(fmt.Sprintf("%d", invoice.ID))
	if err != nil {
		return ResponseError(c, err)
	}

	// Adjust stock based on quantity and product changes
	if quantityDiff != 0 || productChanged {
		locationType, locationID := ih.StockServices.GetLocationTypeAndID(invoice.LocationID)

		if productChanged {
			// If product changed, adjust both old and new products
			// Remove old quantity from old product
			if err := ih.StockServices.UpdateStock(oldProductID, locationType, locationID, -oldQuantity); err != nil {
				log.Printf("[UPDATE PURCHASE ITEM] Error removing stock from old product: %v", err)
			}
			// Add new quantity to new product
			if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, req.Quantity); err != nil {
				log.Printf("[UPDATE PURCHASE ITEM] Error adding stock to new product: %v", err)
			}
		} else {
			// Same product, just adjust quantity difference
			if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, quantityDiff); err != nil {
				log.Printf("[UPDATE PURCHASE ITEM] Error adjusting stock: %v", err)
			}
		}

		// Create stock movement record
		notes := fmt.Sprintf("Updated purchase invoice #%s item", invoice.ID)
		var movementQuantity float64
		if productChanged {
			movementQuantity = req.Quantity
		} else {
			movementQuantity = quantityDiff
		}
		if err := ih.StockServices.CreateMovement(
			req.ProductID,
			"purchase",
			movementQuantity,
			"", // No source for purchases
			0,  // No source ID for purchases
			locationType,
			locationID,
			notes,
			user.ID,
		); err != nil {
			log.Printf("[UPDATE PURCHASE ITEM] Error creating movement record: %v", err)
		}
	}

	log.Printf("[UPDATE PURCHASE ITEM] Item %s updated in invoice #%s, quantity changed from %.2f to %.2f", itemID, id, oldQuantity, req.Quantity)
	return ResponseSuccess(c, "Purchase invoice item updated successfully", updatedInvoice)
}

// AddSalesInvoiceItem adds a new item to an existing sales invoice
func (ih *InvoiceHandler) AddSalesInvoiceItem(c echo.Context) error {
	id := c.Param("id")

	var req struct {
		ProductID       uint    `json:"product_id"`
		Quantity        float64 `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		DiscountPercent float64 `json:"discount_percent"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get the invoice
	invoice, err := ih.SalesInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Add the new item
	if err := ih.SalesInvoiceServices.AddItem(invoice.ID, req.ProductID, req.Quantity, req.UnitPrice, req.DiscountPercent); err != nil {
		return ResponseError(c, err)
	}

	// Recalculate invoice totals
	if err := ih.SalesInvoiceServices.RecalculateTotals(invoice.ID); err != nil {
		return ResponseError(c, err)
	}

	// Get updated invoice
	updatedInvoice, err := ih.SalesInvoiceServices.GetID(fmt.Sprintf("%d", invoice.ID))
	if err != nil {
		return ResponseError(c, err)
	}

	// Adjust stock (reduce from location for sales)
	locationType, locationID := ih.StockServices.GetLocationTypeAndID(invoice.LocationID)
	if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, -req.Quantity); err != nil {
		log.Printf("[ADD SALES ITEM] Error reducing stock: %v", err)
	}

	// Create stock movement record
	notes := fmt.Sprintf("Added item to sales invoice #%s", invoice.ID)
	if err := ih.StockServices.CreateMovement(
		req.ProductID,
		"sale",
		req.Quantity,
		locationType,
		locationID,
		"", // No destination for sales
		0,  // No destination ID for sales
		notes,
		user.ID,
	); err != nil {
		log.Printf("[ADD SALES ITEM] Error creating movement record: %v", err)
	}

	log.Printf("[ADD SALES ITEM] New item added to invoice #%s", id)
	return ResponseSuccess(c, "Sales invoice item added successfully", updatedInvoice)
}

// AddPurchaseInvoiceItem adds a new item to an existing purchase invoice
func (ih *InvoiceHandler) AddPurchaseInvoiceItem(c echo.Context) error {
	id := c.Param("id")

	var req struct {
		ProductID       uint    `json:"product_id"`
		Quantity        float64 `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		DiscountPercent float64 `json:"discount_percent"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Get the invoice
	invoice, err := ih.PurchaseInvoiceServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Add the new item
	if err := ih.PurchaseInvoiceServices.AddItem(invoice.ID, req.ProductID, req.Quantity, req.UnitPrice, req.DiscountPercent); err != nil {
		return ResponseError(c, err)
	}

	// Recalculate invoice totals
	if err := ih.PurchaseInvoiceServices.RecalculateTotals(invoice.ID); err != nil {
		return ResponseError(c, err)
	}

	// Get updated invoice
	updatedInvoice, err := ih.PurchaseInvoiceServices.GetID(fmt.Sprintf("%d", invoice.ID))
	if err != nil {
		return ResponseError(c, err)
	}

	// Adjust stock (add to location for purchases)
	locationType, locationID := ih.StockServices.GetLocationTypeAndID(invoice.LocationID)
	if err := ih.StockServices.UpdateStock(req.ProductID, locationType, locationID, req.Quantity); err != nil {
		log.Printf("[ADD PURCHASE ITEM] Error adding stock: %v", err)
	}

	// Create stock movement record
	notes := fmt.Sprintf("Added item to purchase invoice #%s", invoice.ID)
	if err := ih.StockServices.CreateMovement(
		req.ProductID,
		"purchase",
		req.Quantity,
		"", // No source for purchases
		0,  // No source ID for purchases
		locationType,
		locationID,
		notes,
		user.ID,
	); err != nil {
		log.Printf("[ADD PURCHASE ITEM] Error creating movement record: %v", err)
	}

	log.Printf("[ADD PURCHASE ITEM] New item added to invoice #%s", id)
	return ResponseSuccess(c, "Purchase invoice item added successfully", updatedInvoice)
}

func (ih *InvoiceHandler) DeleteInvoiceHandler(c echo.Context) error {
	id := c.Param("id")
	invoiceType := c.QueryParam("invoice_type")
	if invoiceType == "" {
		invoiceType = "sales"
	}

	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Start transaction
	tx := ih.StockServices.GetDB().Begin()
	if tx.Error != nil {
		return ResponseError(c, tx.Error)
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get the invoice to delete
	var invoiceTypeStr string
	var locationID uint
	var items []interface{}

	if invoiceType == "purchase" {
		invoice, err := ih.PurchaseInvoiceServices.GetID(id)
		if err != nil {
			tx.Rollback()
			return ResponseError(c, err)
		}
		locationID = invoice.LocationID
		invoiceTypeStr = "purchase"
		for _, item := range invoice.Items {
			items = append(items, item)
		}
	} else {
		invoice, err := ih.SalesInvoiceServices.GetID(id)
		if err != nil {
			tx.Rollback()
			return ResponseError(c, err)
		}
		locationID = invoice.LocationID
		invoiceTypeStr = "sales"
		for _, item := range invoice.Items {
			items = append(items, item)
		}
	}

	// Convert ID to uint for payment deletion
	invoiceIDUint, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		tx.Rollback()
		return ResponseError(c, errors.New("invalid invoice ID"))
	}

	// Delete associated payments
	if err := ih.PaymentServices.DeleteByInvoiceID(uint(invoiceIDUint)); err != nil {
		tx.Rollback()
		log.Printf("[DELETE INVOICE] Error deleting payments: %v", err)
		return ResponseError(c, err)
	}

	// Restore stock quantities
	locationType, locationIDFinal := ih.StockServices.GetLocationTypeAndID(locationID)

	for _, itemInterface := range items {
		var productID uint
		var quantity float64

		if invoiceTypeStr == "purchase" {
			if item, ok := itemInterface.(models.PurchaseInvoiceItem); ok {
				productID = item.ProductID
				quantity = item.Quantity

				// Validate stock availability before allowing purchase invoice deletion
				currentStock, err := ih.StockServices.GetProductStock(productID, locationType, locationIDFinal)
				if err != nil {
					if !errors.Is(err, gorm.ErrRecordNotFound) {
						tx.Rollback()
						return ResponseError(c, err)
					}
					// No stock record exists, so cannot delete purchase invoice
					tx.Rollback()
					return ResponseError(c, fmt.Errorf("cannot delete purchase invoice: no stock record found for product ID %d", productID))
				}

				if currentStock.Quantity < quantity {
					tx.Rollback()
					return ResponseError(c, fmt.Errorf("cannot delete purchase invoice: insufficient stock for product ID %d (available: %.2f, required: %.2f)", productID, currentStock.Quantity, quantity))
				}

				// For purchase invoices, we need to subtract the added stock
				if err := ih.StockServices.UpdateStock(productID, locationType, locationIDFinal, -quantity); err != nil {
					tx.Rollback()
					log.Printf("[DELETE PURCHASE INVOICE] Error restoring stock: %v", err)
					return ResponseError(c, err)
				}
			}
		} else {
			if item, ok := itemInterface.(models.SalesInvoiceItem); ok {
				productID = item.ProductID
				quantity = item.Quantity
				// For sales invoices, we need to add back the removed stock
				if err := ih.StockServices.UpdateStock(productID, locationType, locationIDFinal, quantity); err != nil {
					tx.Rollback()
					log.Printf("[DELETE SALES INVOICE] Error restoring stock: %v", err)
					return ResponseError(c, err)
				}
			}
		}

		// Create stock movement record for restoration
		notes := fmt.Sprintf("Deleted %s invoice #%s - stock restored", invoiceTypeStr, id)
		var movementQuantity float64
		if invoiceTypeStr == "purchase" {
			movementQuantity = -quantity // Negative to show stock removal
		} else {
			movementQuantity = quantity // Positive to show stock addition
		}

		if err := ih.StockServices.CreateMovement(
			productID,
			invoiceTypeStr+"_delete", // movement type
			movementQuantity,
			locationType,
			locationIDFinal,
			"", // No source/destination for deletions
			0,  // No source/destination ID for deletions
			notes,
			user.ID,
		); err != nil {
			log.Printf("[DELETE INVOICE] Error creating movement record: %v", err)
			// Don't fail the deletion if movement recording fails
		}
	}

	// Delete the invoice (soft delete)
	if invoiceType == "purchase" {
		if err := ih.PurchaseInvoiceServices.Delete(id); err != nil {
			tx.Rollback()
			return ResponseError(c, err)
		}
	} else {
		if err := ih.SalesInvoiceServices.Delete(id); err != nil {
			tx.Rollback()
			return ResponseError(c, err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return ResponseError(c, err)
	}

	log.Printf("[DELETE INVOICE] %s invoice #%s deleted successfully", invoiceTypeStr, id)
	return ResponseSuccess(c, fmt.Sprintf("%s invoice deleted successfully", invoiceTypeStr), nil)
}
