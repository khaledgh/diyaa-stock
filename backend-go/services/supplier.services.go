package services

import (
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type SupplierService struct {
	Supplier models.Supplier
	DB       *gorm.DB
}

func NewSupplierService(c models.Supplier, db *gorm.DB) *SupplierService {
	return &SupplierService{
		Supplier: c,
		DB:       db,
	}
}

func (ss *SupplierService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	suppliers := []models.Supplier{}
	var totalRecords int64
	
	query := ss.DB.Model(&models.Supplier{})
	if searchTerm != "" {
		query = query.Where("supplier_name LIKE ? OR supplier_phone LIKE ?  OR supplier_address LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&totalRecords)
	
	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Offset(offset).Limit(limit).Find(&suppliers).Error; err != nil {
		return PaginationResponse{}, err
	}
	
	totalPages := int(math.Ceil(float64(totalRecords) / float64(limit)))
	
	return PaginationResponse{
		Data:        suppliers,
		Total:       int(totalRecords),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (ss *SupplierService) GetID(id string) (models.Supplier, error) {
	var supplier models.Supplier
	if result := ss.DB.First(&supplier, id); result.Error != nil {
		return models.Supplier{}, result.Error
	}
	return supplier, nil
}

func (ss *SupplierService) Create(supplier models.Supplier) (models.Supplier, error) {
	if result := ss.DB.Create(&supplier); result.Error != nil {
		return models.Supplier{}, result.Error
	}
	return supplier, nil
}

func (ss *SupplierService) Update(supplier models.Supplier) (models.Supplier, error) {
	if result := ss.DB.Model(&supplier).Updates(supplier); result.Error != nil {
		return models.Supplier{}, result.Error
	}
	return supplier, nil
}

func (cs *SupplierService) Delete(supplier models.Supplier) error {
	if result := cs.DB.Delete(&supplier); result.Error != nil {
		return result.Error
	}
	return nil
}
