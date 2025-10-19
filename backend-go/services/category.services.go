package services

import (
	"errors"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type CategoryService struct {
	model models.Category
	db    *gorm.DB
}

func NewCategoryService(model models.Category, db *gorm.DB) *CategoryService {
	return &CategoryService{
		model: model,
		db:    db,
	}
}

func (s *CategoryService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var categories []models.Category
	var total int64

	query := s.db.Model(&models.Category{})

	if searchTerm != "" {
		query = query.Where("name_en LIKE ? OR name_ar LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&categories).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        categories,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *CategoryService) GetID(id string) (models.Category, error) {
	var category models.Category
	if err := s.db.First(&category, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return category, errors.New("category not found")
		}
		return category, err
	}
	return category, nil
}

func (s *CategoryService) Create(category models.Category) (models.Category, error) {
	if err := s.db.Create(&category).Error; err != nil {
		return category, err
	}
	return category, nil
}

func (s *CategoryService) Update(category models.Category) (models.Category, error) {
	if err := s.db.Save(&category).Error; err != nil {
		return category, err
	}
	return category, nil
}

func (s *CategoryService) Delete(category models.Category) error {
	if err := s.db.Delete(&category).Error; err != nil {
		return err
	}
	return nil
}
