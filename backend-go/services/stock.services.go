package services

import (
	"errors"
	"fmt"
	"log"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type StockService struct {
	model models.Stock
	db    *gorm.DB
}

func NewStockService(model models.Stock, db *gorm.DB) *StockService {
	return &StockService{
		model: model,
		db:    db,
	}
}

// GetWarehouseStock returns stock for warehouse location
func (s *StockService) GetWarehouseStock() ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	// Query all stock records where location_type = 'warehouse'
	// Don't filter by location_id since warehouses use their actual location ID
	err := s.db.Table("stocks").
		Select("stocks.*, products.sku, products.name_en, products.name_ar, products.unit, products.min_stock_level, categories.name_en as category_name_en, categories.name_ar as category_name_ar").
		Joins("LEFT JOIN products ON stocks.product_id = products.id").
		Joins("LEFT JOIN categories ON products.category_id = categories.id").
		Where("stocks.location_type = ?", "warehouse").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	log.Printf("[STOCK SERVICE] GetWarehouseStock found %d records", len(results))
	return results, nil
}

// GetVanStock returns stock for a specific van
func (s *StockService) GetVanStock(vanID string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := s.db.Table("stocks").
		Select("stocks.*, products.sku, products.name_en, products.name_ar, products.unit, products.min_stock_level, categories.name_en as category_name_en, categories.name_ar as category_name_ar").
		Joins("LEFT JOIN products ON stocks.product_id = products.id").
		Joins("LEFT JOIN categories ON products.category_id = categories.id").
		Where("stocks.location_type = ?", "van").
		Where("stocks.location_id = ?", vanID).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}
	return results, nil
}

// GetLocationStock returns stock for a specific location
func (s *StockService) GetLocationStock(locationID string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	log.Printf("[STOCK SERVICE] GetLocationStock called for location ID: %s", locationID)

	// Get the location type from the database
	var location struct {
		Type string `gorm:"column:type"`
	}
	err := s.db.Table("locations").Select("type").Where("id = ?", locationID).First(&location).Error

	var locationType string

	if err != nil {
		log.Printf("[STOCK SERVICE] Error getting location type: %v, defaulting to 'location'", err)
		locationType = "location"
	} else {
		locationType = location.Type
		log.Printf("[STOCK SERVICE] Location %s has type '%s', querying with location_type='%s' and location_id=%s",
			locationID, location.Type, locationType, locationID)
	}

	err = s.db.Table("stocks").
		Select("stocks.*, products.sku, products.name_en, products.name_ar, products.unit, products.unit_price, products.barcode, products.min_stock_level, categories.name_en as category_name_en, categories.name_ar as category_name_ar").
		Joins("LEFT JOIN products ON stocks.product_id = products.id").
		Joins("LEFT JOIN categories ON products.category_id = categories.id").
		Where("stocks.location_type = ?", locationType).
		Where("stocks.location_id = ?", locationID).
		Scan(&results).Error

	if err != nil {
		log.Printf("[STOCK SERVICE] Error querying stock: %v", err)
		return nil, err
	}

	log.Printf("[STOCK SERVICE] Found %d stock records for location %s (type: %s)", len(results), locationID, locationType)
	return results, nil
}

// GetAllStockByLocation returns all stock grouped by location
func (s *StockService) GetAllStockByLocation() ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := s.db.Table("stocks").
		Select("stocks.*, products.sku, products.name_en, products.name_ar, products.unit, products.min_stock_level, categories.name_en as category_name_en, categories.name_ar as category_name_ar, locations.name as location_name").
		Joins("LEFT JOIN products ON stocks.product_id = products.id").
		Joins("LEFT JOIN categories ON products.category_id = categories.id").
		Joins("LEFT JOIN locations ON stocks.location_id = locations.id").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	log.Printf("[STOCK SERVICE] GetAllStockByLocation found %d records", len(results))
	return results, nil
}

// GetInventorySummary returns stock grouped by product with location details
func (s *StockService) GetInventorySummary() ([]map[string]interface{}, error) {
	query := `
		SELECT 
			p.id as product_id,
			p.sku,
			p.name_en,
			p.name_ar,
			p.unit,
			p.min_stock_level,
			c.name_en as category_name_en,
			c.name_ar as category_name_ar,
			SUM(s.quantity) as total_quantity,
			GROUP_CONCAT(
				CONCAT(
					l.id, ':', l.name, ':', 
					s.quantity
				) SEPARATOR '|'
			) as location_quantities
		FROM products p
		LEFT JOIN stocks s ON p.id = s.product_id
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN locations l ON s.location_id = l.id
		WHERE p.is_active = 1
		GROUP BY p.id, p.sku, p.name_en, p.name_ar, p.unit, p.min_stock_level, c.name_en, c.name_ar
		ORDER BY p.name_en
	`

	var results []map[string]interface{}
	err := s.db.Raw(query).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	log.Printf("[STOCK SERVICE] GetInventorySummary found %d products", len(results))
	return results, nil
}

// CreateMovement creates a stock movement record
func (s *StockService) CreateMovement(productID uint, movementType string, quantity float64, fromLocationType string, fromLocationID uint, toLocationType string, toLocationID uint, notes string, createdBy uint) error {
	movement := models.StockMovement{
		ProductID:        productID,
		MovementType:     movementType,
		Quantity:         quantity,
		FromLocationType: fromLocationType,
		FromLocationID:   fromLocationID,
		ToLocationType:   toLocationType,
		ToLocationID:     toLocationID,
		Notes:            &notes,
		CreatedBy:        &createdBy,
	}

	log.Printf("[STOCK SERVICE] Creating movement - Product: %d, Type: %s, Qty: %d, From: %s(%d), To: %s(%d)",
		productID, movementType, quantity, fromLocationType, fromLocationID, toLocationType, toLocationID)

	return s.db.Create(&movement).Error
}

// GetMovements returns stock movements with filters
func (s *StockService) GetMovements(productID, movementType, fromDate, toDate string, limit int) ([]models.StockMovement, error) {
	var movements []models.StockMovement

	query := s.db.Model(&models.StockMovement{}).Preload("Product").Preload("CreatedByUser")

	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	if movementType != "" {
		query = query.Where("movement_type = ?", movementType)
	}

	if fromDate != "" && toDate != "" {
		query = query.Where("DATE(created_at) BETWEEN ? AND ?", fromDate, toDate)
	}

	if limit > 0 {
		query = query.Limit(limit)
	} else {
		query = query.Limit(100)
	}

	err := query.Order("created_at DESC").Find(&movements).Error
	if err != nil {
		return nil, err
	}

	return movements, nil
}

// UpdateStock updates stock quantity (add or subtract)
func (s *StockService) UpdateStock(productID uint, locationType string, locationID uint, quantity float64) error {
	var stock models.Stock

	err := s.db.Where("product_id = ? AND location_type = ? AND location_id = ?",
		productID, locationType, locationID).First(&stock).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new stock record
			stock = models.Stock{
				ProductID:    productID,
				LocationType: locationType,
				LocationID:   locationID,
				Quantity:     quantity,
			}
			return s.db.Create(&stock).Error
		}
		return err
	}

	// Update existing stock
	stock.Quantity += quantity
	return s.db.Save(&stock).Error
}

// SetStock sets stock to exact quantity
func (s *StockService) SetStock(productID uint, locationType string, locationID uint, quantity float64) error {
	var stock models.Stock

	err := s.db.Where("product_id = ? AND location_type = ? AND location_id = ?",
		productID, locationType, locationID).First(&stock).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new stock record
			stock = models.Stock{
				ProductID:    productID,
				LocationType: locationType,
				LocationID:   locationID,
				Quantity:     quantity,
			}
			return s.db.Create(&stock).Error
		}
		return err
	}

	// Set exact quantity
	stock.Quantity = quantity
	return s.db.Save(&stock).Error
}

// GetLocationTypeAndID determines the correct location_type for stock operations
// Returns the location's actual type and the same location ID
func (s *StockService) GetLocationTypeAndID(locationID uint) (string, uint) {
	var location struct {
		Type string `gorm:"column:type"`
	}

	err := s.db.Table("locations").Select("type").Where("id = ?", locationID).First(&location).Error

	if err != nil {
		log.Printf("[STOCK SERVICE] Error getting location %d type: %v, defaulting to 'location'", locationID, err)
		return "location", locationID
	}

	log.Printf("[STOCK SERVICE] Location %d has type '%s', returning location_type='%s' and location_id=%d",
		locationID, location.Type, location.Type, locationID)
	return location.Type, locationID
}

// GetProductStock returns stock for a specific product at a location
func (s *StockService) GetProductStock(productID uint, locationType string, locationID uint) (*models.Stock, error) {
	log.Printf("[STOCK SERVICE] Querying stock - Product ID: %d, Location Type: %s, Location ID: %d",
		productID, locationType, locationID)

	// First, let's see all stock records for this product
	var allStocks []models.Stock
	s.db.Where("product_id = ?", productID).Find(&allStocks)
	log.Printf("[STOCK SERVICE] Found %d stock record(s) for Product ID %d:", len(allStocks), productID)
	for _, s := range allStocks {
		log.Printf("  - Location Type: %s, Location ID: %d, Quantity: %d", s.LocationType, s.LocationID, s.Quantity)
	}

	var stock models.Stock
	err := s.db.Where("product_id = ? AND location_type = ? AND location_id = ?",
		productID, locationType, locationID).First(&stock).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[STOCK SERVICE] No stock found at requested location (Type: %s, ID: %d)",
				locationType, locationID)
			return nil, fmt.Errorf("stock not found")
		}
		log.Printf("[STOCK SERVICE] Database error: %v", err)
		return nil, err
	}

	log.Printf("[STOCK SERVICE] Stock found at requested location - Quantity: %d", stock.Quantity)
	return &stock, nil
}

func (s *StockService) GetDB() *gorm.DB {
	return s.db
}
