package services

import (
	"errors"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type LocationService struct {
	model models.Location
	db    *gorm.DB
}

func NewLocationService(model models.Location, db *gorm.DB) *LocationService {
	return &LocationService{
		model: model,
		db:    db,
	}
}

func (s *LocationService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var locations []models.Location
	var total int64

	query := s.db.Model(&models.Location{}).Preload("Van")

	if searchTerm != "" {
		query = query.Where("name LIKE ? OR address LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&locations).Error; err != nil {
		return PaginationResponse{}, err
	}

	// Populate computed fields
	for i := range locations {
		if locations[i].Van != nil {
			locations[i].VanName = locations[i].Van.Name
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        locations,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *LocationService) GetID(id string) (models.Location, error) {
	var location models.Location
	if err := s.db.Preload("Van").First(&location, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return location, errors.New("location not found")
		}
		return location, err
	}
	
	// Populate computed fields
	if location.Van != nil {
		location.VanName = location.Van.Name
	}
	
	return location, nil
}

func (s *LocationService) Create(location models.Location) (models.Location, error) {
	if err := s.db.Create(&location).Error; err != nil {
		return location, err
	}
	return location, nil
}

func (s *LocationService) Update(location models.Location) (models.Location, error) {
	if err := s.db.Save(&location).Error; err != nil {
		return location, err
	}
	return location, nil
}

func (s *LocationService) Delete(location models.Location) error {
	if err := s.db.Delete(&location).Error; err != nil {
		return err
	}
	return nil
}
