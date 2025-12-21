package services

import (
	"errors"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type VendorService struct {
	model models.Vendor
	db    *gorm.DB
}

func NewVendorService(model models.Vendor, db *gorm.DB) *VendorService {
	return &VendorService{
		model: model,
		db:    db,
	}
}

func (s *VendorService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var total int64

	// Build base query for counting
	countQuery := s.db.Model(&models.Vendor{})
	if searchTerm != "" {
		countQuery = countQuery.Where("name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR email LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}
	countQuery.Count(&total)

	offset := (page - 1) * limit

	// Get vendors
	var vendorModels []models.Vendor
	baseQuery := s.db.Model(&models.Vendor{})
	if searchTerm != "" {
		baseQuery = baseQuery.Where("name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR email LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}
	if err := baseQuery.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&vendorModels).Error; err != nil {
		return PaginationResponse{}, err
	}

	// Calculate purchase stats for each vendor
	for i := range vendorModels {
		var stats struct {
			TotalPurchases int64
			TotalAmount    float64
		}
		s.db.Model(&models.PurchaseInvoice{}).
			Select("COUNT(*) as total_purchases, COALESCE(SUM(total_amount), 0) as total_amount").
			Where("vendor_id = ?", vendorModels[i].ID).
			Scan(&stats)

		vendorModels[i].TotalPurchases = int(stats.TotalPurchases)
		vendorModels[i].TotalAmount = stats.TotalAmount
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        vendorModels,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *VendorService) GetID(id string) (models.Vendor, error) {
	var vendor models.Vendor
	if err := s.db.First(&vendor, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return vendor, errors.New("vendor not found")
		}
		return vendor, err
	}
	return vendor, nil
}

func (s *VendorService) Create(vendor models.Vendor) (models.Vendor, error) {
	if err := s.db.Create(&vendor).Error; err != nil {
		return vendor, err
	}
	return vendor, nil
}

func (s *VendorService) Update(vendor models.Vendor) (models.Vendor, error) {
	if err := s.db.Save(&vendor).Error; err != nil {
		return vendor, err
	}
	return vendor, nil
}

func (s *VendorService) Delete(vendor models.Vendor) error {
	if err := s.db.Delete(&vendor).Error; err != nil {
		return err
	}
	return nil
}
