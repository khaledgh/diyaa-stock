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
	var vendors []models.Vendor
	var total int64

	query := s.db.Model(&models.Vendor{})

	if searchTerm != "" {
		query = query.Where("name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR email LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&vendors).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        vendors,
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
