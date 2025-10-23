package services

import (
	"errors"
	"math"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type VanService struct {
	model models.Van
	db    *gorm.DB
}

func NewVanService(model models.Van, db *gorm.DB) *VanService {
	return &VanService{
		model: model,
		db:    db,
	}
}

func (s *VanService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var vans []models.Van
	var total int64

	query := s.db.Model(&models.Van{})

	if searchTerm != "" {
		query = query.Where("name LIKE ? OR plate_number LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&vans).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        vans,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *VanService) GetID(id string) (models.Van, error) {
	var van models.Van
	if err := s.db.First(&van, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return van, errors.New("van not found")
		}
		return van, err
	}
	
	return van, nil
}

func (s *VanService) Create(van models.Van) (models.Van, error) {
	if err := s.db.Create(&van).Error; err != nil {
		return van, err
	}
	return s.GetID(strconv.Itoa(int(van.ID)))
}

func (s *VanService) Update(van models.Van) (models.Van, error) {
	if err := s.db.Save(&van).Error; err != nil {
		return van, err
	}
	return s.GetID(strconv.Itoa(int(van.ID)))
}

func (s *VanService) Delete(van models.Van) error {
	if err := s.db.Delete(&van).Error; err != nil {
		return err
	}
	return nil
}
