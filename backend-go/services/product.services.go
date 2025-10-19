package services

import (
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type ProductServices struct {
	Product models.Product
	DB      *gorm.DB
}

func NewProductServices(c models.Product, db *gorm.DB) *ProductServices {
	return &ProductServices{
		Product: c,
		DB:      db,
	}
}

func (ss *ProductServices) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	products := []models.Product{}
	var totalRecords int64
	
	query := ss.DB.Model(&models.Product{}).
		Preload("Category").
		Preload("ProductType").
		Where("is_active = ?", true)

	if searchTerm != "" {
		query = query.Where("name_en LIKE ? OR name_ar LIKE ? OR sku LIKE ? OR description LIKE ?",
			"%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&totalRecords)
	
	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Offset(offset).Limit(limit).Find(&products).Error; err != nil {
		return PaginationResponse{}, err
	}
	
	totalPages := int(math.Ceil(float64(totalRecords) / float64(limit)))
	
	return PaginationResponse{
		Data:        products,
		Total:       int(totalRecords),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (cs *ProductServices) GetID(id string) (models.Product, error) {
	var Product models.Product
	if result := cs.DB.Preload("Category").Preload("ProductType").First(&Product, id); result.Error != nil {
		return models.Product{}, result.Error
	}
	return Product, nil
}

func (cs *ProductServices) Create(Product models.Product) (models.Product, error) {
	if result := cs.DB.Create(&Product); result.Error != nil {
		return models.Product{}, result.Error
	}
	return Product, nil
}

func (cs *ProductServices) Update(Product models.Product) (models.Product, error) {
	// Use Select to update all fields including zero values
	if result := cs.DB.Model(&Product).Select(
		"SKU", "Barcode", "NameEn", "NameAr", "Description",
		"CategoryID", "TypeID", "UnitPrice", "CostPrice",
		"Unit", "MinStockLevel", "IsActive",
	).Updates(Product); result.Error != nil {
		return models.Product{}, result.Error
	}
	return Product, nil
}

func (cs *ProductServices) Delete(Product models.Product) error {
	if result := cs.DB.Delete(&Product); result.Error != nil {
		return result.Error
	}
	return nil
}
