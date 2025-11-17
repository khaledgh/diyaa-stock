package services

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type CreditNoteService struct {
	db *gorm.DB
}

func NewCreditNoteService(db *gorm.DB) *CreditNoteService {
	return &CreditNoteService{
		db: db,
	}
}

// GetAll retrieves all credit notes with pagination
func (s *CreditNoteService) GetAll(limit, page int, orderBy, sortBy, status, searchTerm string) (PaginationResponse, error) {
	var creditNotes []models.CreditNote
	var total int64

	query := s.db.Model(&models.CreditNote{}).
		Preload("Vendor").
		Preload("Location").
		Preload("Creator").
		Preload("Items.Product")

	// Filter by status
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	// Search
	if searchTerm != "" {
		query = query.Where("credit_note_number LIKE ?", "%"+searchTerm+"%")
	}

	query.Count(&total)

	// Validate sortBy
	validSortFields := map[string]bool{
		"id": true, "credit_note_number": true, "credit_note_date": true,
		"total_amount": true, "status": true, "created_at": true,
	}
	if !validSortFields[sortBy] {
		sortBy = "created_at"
	}

	// Validate orderBy
	if orderBy != "asc" && orderBy != "desc" {
		orderBy = "desc"
	}

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&creditNotes).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        creditNotes,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

// GetByID retrieves a credit note by ID
func (s *CreditNoteService) GetByID(id string) (models.CreditNote, error) {
	var creditNote models.CreditNote
	if err := s.db.Preload("Vendor").
		Preload("Location").
		Preload("Creator").
		Preload("PurchaseInvoice").
		Preload("Items.Product").
		First(&creditNote, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return creditNote, errors.New("credit note not found")
		}
		return creditNote, err
	}
	return creditNote, nil
}

// Create creates a new credit note
func (s *CreditNoteService) Create(creditNote models.CreditNote) (models.CreditNote, error) {
	// Generate credit note number
	creditNote.CreditNoteNumber = s.generateCreditNoteNumber()
	creditNote.Status = "draft"

	// Calculate total amount from items
	var totalAmount float64
	for i := range creditNote.Items {
		creditNote.Items[i].Total = float64(creditNote.Items[i].Quantity) * creditNote.Items[i].UnitPrice
		totalAmount += creditNote.Items[i].Total
	}
	creditNote.TotalAmount = totalAmount

	// Create credit note with items
	if err := s.db.Create(&creditNote).Error; err != nil {
		return creditNote, err
	}

	return s.GetByID(strconv.Itoa(int(creditNote.ID)))
}

// Update updates a credit note (only if status is draft)
func (s *CreditNoteService) Update(id string, creditNote models.CreditNote) (models.CreditNote, error) {
	existing, err := s.GetByID(id)
	if err != nil {
		return creditNote, err
	}

	if existing.Status != "draft" {
		return creditNote, errors.New("only draft credit notes can be updated")
	}

	// Update basic fields
	existing.VendorID = creditNote.VendorID
	existing.LocationID = creditNote.LocationID
	existing.CreditNoteDate = creditNote.CreditNoteDate
	existing.Notes = creditNote.Notes
	existing.PurchaseInvoiceID = creditNote.PurchaseInvoiceID

	// Delete existing items
	if err := s.db.Where("credit_note_id = ?", existing.ID).Delete(&models.CreditNoteItem{}).Error; err != nil {
		return creditNote, err
	}

	// Add new items and calculate total
	var totalAmount float64
	for i := range creditNote.Items {
		creditNote.Items[i].CreditNoteID = existing.ID
		creditNote.Items[i].Total = float64(creditNote.Items[i].Quantity) * creditNote.Items[i].UnitPrice
		totalAmount += creditNote.Items[i].Total
	}
	existing.TotalAmount = totalAmount
	existing.Items = creditNote.Items

	if err := s.db.Save(&existing).Error; err != nil {
		return creditNote, err
	}

	return s.GetByID(id)
}

// Approve approves a credit note and processes stock adjustments
func (s *CreditNoteService) Approve(id string, approvedBy uint) (models.CreditNote, error) {
	creditNote, err := s.GetByID(id)
	if err != nil {
		return creditNote, err
	}

	if creditNote.Status != "draft" {
		return creditNote, errors.New("only draft credit notes can be approved")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Process each item - reduce stock from location
	for _, item := range creditNote.Items {
		// Check if stock exists
		var stock models.Stock
		if err := tx.Where("product_id = ? AND location_id = ?", item.ProductID, creditNote.LocationID).
			First(&stock).Error; err != nil {
			tx.Rollback()
			return creditNote, fmt.Errorf("stock not found for product %d at location %d", item.ProductID, creditNote.LocationID)
		}

		// Check if sufficient quantity
		if stock.Quantity < item.Quantity {
			tx.Rollback()
			return creditNote, fmt.Errorf("insufficient stock for product %d. Available: %d, Required: %d",
				item.ProductID, stock.Quantity, item.Quantity)
		}

		// Reduce stock
		stock.Quantity -= item.Quantity
		if err := tx.Save(&stock).Error; err != nil {
			tx.Rollback()
			return creditNote, err
		}

		// Create stock movement record
		notes := fmt.Sprintf("Credit Note: %s - %s", creditNote.CreditNoteNumber, item.Reason)
		movement := models.StockMovement{
			ProductID:        item.ProductID,
			FromLocationType: "location",
			FromLocationID:   creditNote.LocationID,
			ToLocationType:   "vendor",
			ToLocationID:     creditNote.VendorID,
			MovementType:     "credit_note_return",
			Quantity:         item.Quantity,
			ReferenceID:      &creditNote.ID,
			Notes:            &notes,
			CreatedBy:        &approvedBy,
		}
		if err := tx.Create(&movement).Error; err != nil {
			tx.Rollback()
			return creditNote, err
		}
	}

	// Update credit note status
	creditNote.Status = "approved"
	if err := tx.Save(&creditNote).Error; err != nil {
		tx.Rollback()
		return creditNote, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return creditNote, err
	}

	return s.GetByID(id)
}

// Cancel cancels a credit note
func (s *CreditNoteService) Cancel(id string) (models.CreditNote, error) {
	creditNote, err := s.GetByID(id)
	if err != nil {
		return creditNote, err
	}

	if creditNote.Status == "cancelled" {
		return creditNote, errors.New("credit note is already cancelled")
	}

	if creditNote.Status == "approved" {
		return creditNote, errors.New("approved credit notes cannot be cancelled")
	}

	creditNote.Status = "cancelled"
	if err := s.db.Save(&creditNote).Error; err != nil {
		return creditNote, err
	}

	return s.GetByID(id)
}

// Delete soft deletes a credit note (only if draft or cancelled)
func (s *CreditNoteService) Delete(id string) error {
	creditNote, err := s.GetByID(id)
	if err != nil {
		return err
	}

	if creditNote.Status == "approved" {
		return errors.New("approved credit notes cannot be deleted")
	}

	return s.db.Delete(&creditNote).Error
}

// generateCreditNoteNumber generates a unique credit note number
func (s *CreditNoteService) generateCreditNoteNumber() string {
	var count int64
	s.db.Model(&models.CreditNote{}).Count(&count)
	return fmt.Sprintf("CN-%s-%05d", time.Now().Format("200601"), count+1)
}
