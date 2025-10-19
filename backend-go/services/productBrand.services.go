package services

import (
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type ProductBrandServices struct {
	ProductBrand models.ProductBrand
	DB           *gorm.DB
}

func NewProductBrandServices(c models.ProductBrand, db *gorm.DB) *ProductBrandServices {
	return &ProductBrandServices{
		ProductBrand: c,
		DB:           db,
	}
}

func (ss *ProductBrandServices) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	shops := []models.ProductBrand{}
	var totalRecords int64
	
	query := ss.DB.Model(&models.ProductBrand{})
	if searchTerm != "" {
		query = query.Where("brand_name LIKE ?", "%"+searchTerm+"%")
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

func (cs *ProductBrandServices) GetID(id string) (models.ProductBrand, error) {
	var ProductBrand models.ProductBrand
	if result := cs.DB.First(&ProductBrand, id); result.Error != nil {
		return models.ProductBrand{}, result.Error
	}
	return ProductBrand, nil
}

func (cs *ProductBrandServices) Create(ProductBrand models.ProductBrand) (models.ProductBrand, error) {
	if result := cs.DB.Create(&ProductBrand); result.Error != nil {
		return models.ProductBrand{}, result.Error
	}
	return ProductBrand, nil
}

func (cs *ProductBrandServices) Update(ProductBrand models.ProductBrand) (models.ProductBrand, error) {
	if result := cs.DB.Model(&ProductBrand).Updates(ProductBrand); result.Error != nil {
		return models.ProductBrand{}, result.Error
	}
	return ProductBrand, nil
}

func (cs *ProductBrandServices) Delete(ProductBrand models.ProductBrand) error {
	if result := cs.DB.Delete(&ProductBrand); result.Error != nil {
		return result.Error
	}
	return nil
}
