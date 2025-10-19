package services

import (
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type ProductTypeServices struct {
	ProductType models.ProductType
	DB          *gorm.DB
}

func NewProductTypeServices(c models.ProductType, db *gorm.DB) *ProductTypeServices {
	return &ProductTypeServices{
		ProductType: c,
		DB:          db,
	}
}

func (ss *ProductTypeServices) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	shops := []models.ProductType{}
	var totalRecords int64
	
	query := ss.DB.Model(&models.ProductType{})
	if searchTerm != "" {
		query = query.Where("type_name LIKE ?", "%"+searchTerm+"%")
	}
	
	query.Count(&totalRecords)
	
	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Offset(offset).Limit(limit).Find(&shops).Error; err != nil {
		return PaginationResponse{}, err
	}
	
	totalPages := int(math.Ceil(float64(totalRecords) / float64(limit)))
	
	return PaginationResponse{
		Data:        shops,
		Total:       int(totalRecords),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (cs *ProductTypeServices) GetID(id string) (models.ProductType, error) {
	var ProductType models.ProductType
	if result := cs.DB.First(&ProductType, id); result.Error != nil {
		return models.ProductType{}, result.Error
	}
	return ProductType, nil
}

func (cs *ProductTypeServices) Create(ProductType models.ProductType) (models.ProductType, error) {
	if result := cs.DB.Create(&ProductType); result.Error != nil {
		return models.ProductType{}, result.Error
	}
	return ProductType, nil
}

func (cs *ProductTypeServices) Update(ProductType models.ProductType) (models.ProductType, error) {
	if result := cs.DB.Model(&ProductType).Updates(ProductType); result.Error != nil {
		return models.ProductType{}, result.Error
	}
	return ProductType, nil
}

func (cs *ProductTypeServices) Delete(ProductType models.ProductType) error {
	if result := cs.DB.Delete(&ProductType); result.Error != nil {
		return result.Error
	}
	return nil
}
