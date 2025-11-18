package services

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type SalesInvoiceService struct {
	model models.SalesInvoice
	db    *gorm.DB
}

func NewSalesInvoiceService(model models.SalesInvoice, db *gorm.DB) *SalesInvoiceService {
	return &SalesInvoiceService{
		model: model,
		db:    db,
	}
}

func (s *SalesInvoiceService) GetALL(filters map[string]string, limit, offset int) ([]models.SalesInvoice, int64, error) {
	var invoices []models.SalesInvoice
	var total int64

	query := s.db.Model(&models.SalesInvoice{}).
		Preload("Customer").
		Preload("Location").
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product")

	// Apply filters
	if search, ok := filters["search"]; ok && search != "" {
		query = query.Where("invoice_number LIKE ?", "%"+search+"%")
	}

	if paymentStatus, ok := filters["payment_status"]; ok && paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	if customerID, ok := filters["customer_id"]; ok && customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}

	if locationID, ok := filters["location_id"]; ok && locationID != "" {
		query = query.Where("location_id = ?", locationID)
	}

	if fromDate, ok := filters["from_date"]; ok && fromDate != "" {
		if toDate, ok := filters["to_date"]; ok && toDate != "" {
			query = query.Where("DATE(created_at) BETWEEN ? AND ?", fromDate, toDate)
		}
	}

	query.Count(&total)

	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&invoices).Error
	if err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func (s *SalesInvoiceService) GetID(id string) (models.SalesInvoice, error) {
	var invoice models.SalesInvoice
	if err := s.db.Preload("Customer").
		Preload("Location").
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product").
		First(&invoice, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return invoice, errors.New("invoice not found")
		}
		return invoice, err
	}
	return invoice, nil
}

func (s *SalesInvoiceService) GetCount() (int64, error) {
	var count int64
	err := s.db.Model(&models.SalesInvoice{}).Count(&count).Error
	return count, err
}

func (s *SalesInvoiceService) Create(invoice models.SalesInvoice) (models.SalesInvoice, error) {
	// Generate invoice number
	invoice.InvoiceNumber = s.generateInvoiceNumber()

	if err := s.db.Create(&invoice).Error; err != nil {
		return invoice, err
	}
	return s.GetID(fmt.Sprintf("%d", invoice.ID))
}

func (s *SalesInvoiceService) Update(invoice models.SalesInvoice) (models.SalesInvoice, error) {
	if err := s.db.Save(&invoice).Error; err != nil {
		return invoice, err
	}
	return s.GetID(fmt.Sprintf("%d", invoice.ID))
}

func (s *SalesInvoiceService) UpdateItem(itemID uint, productID uint, quantity int, unitPrice, discountPercent float64) error {
	var item models.SalesInvoiceItem
	if err := s.db.First(&item, itemID).Error; err != nil {
		return err
	}

	// Calculate new total
	subtotal := float64(quantity) * unitPrice
	discountAmount := subtotal * discountPercent / 100
	newTotal := subtotal - discountAmount

	// Update item
	item.ProductID = productID
	item.Quantity = quantity
	item.UnitPrice = unitPrice
	item.DiscountPercent = discountPercent
	item.Total = newTotal

	return s.db.Save(&item).Error
}

func (s *SalesInvoiceService) AddItem(invoiceID uint, productID uint, quantity int, unitPrice, discountPercent float64) error {
	// Calculate total for the new item
	subtotal := float64(quantity) * unitPrice
	discountAmount := subtotal * discountPercent / 100
	newTotal := subtotal - discountAmount

	// Create new item
	newItem := models.SalesInvoiceItem{
		InvoiceID:       invoiceID,
		ProductID:       productID,
		Quantity:        quantity,
		UnitPrice:       unitPrice,
		DiscountPercent: discountPercent,
		Total:           newTotal,
	}

	return s.db.Create(&newItem).Error
}

func (s *SalesInvoiceService) RecalculateTotals(invoiceID uint) error {
	var invoice models.SalesInvoice
	if err := s.db.Preload("Items").First(&invoice, invoiceID).Error; err != nil {
		return err
	}

	// Recalculate total
	var totalAmount float64
	for _, item := range invoice.Items {
		totalAmount += item.Total
	}
	invoice.TotalAmount = totalAmount

	// Update payment status
	if invoice.PaidAmount >= totalAmount {
		invoice.PaymentStatus = "paid"
	} else if invoice.PaidAmount > 0 {
		invoice.PaymentStatus = "partial"
	} else {
		invoice.PaymentStatus = "unpaid"
	}

	return s.db.Save(&invoice).Error
}

func (s *SalesInvoiceService) UpdatePaymentStatus(id uint, paidAmount float64) error {
	var invoice models.SalesInvoice
	if err := s.db.First(&invoice, id).Error; err != nil {
		return err
	}

	invoice.PaidAmount = paidAmount

	if paidAmount >= invoice.TotalAmount {
		invoice.PaymentStatus = "paid"
	} else if paidAmount > 0 {
		invoice.PaymentStatus = "partial"
	} else {
		invoice.PaymentStatus = "unpaid"
	}

	return s.db.Save(&invoice).Error
}

func (s *SalesInvoiceService) generateInvoiceNumber() string {
	var count int64
	s.db.Model(&models.SalesInvoice{}).Count(&count)
	return fmt.Sprintf("SI-%s-%05d", time.Now().Format("200601"), count+1)
}

func (s *SalesInvoiceService) GetPaginated(limit, page int, orderBy, sortBy string, filters map[string]string) (PaginationResponse, error) {
	var invoices []models.SalesInvoice
	var total int64

	offset := (page - 1) * limit
	invoices, total, err := s.GetALL(filters, limit, offset)
	if err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        invoices,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}
