package services

import (
	"errors"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type CustomerService struct {
	model models.Customer
	db    *gorm.DB
}

func NewCustomerService(model models.Customer, db *gorm.DB) *CustomerService {
	return &CustomerService{
		model: model,
		db:    db,
	}
}

func (s *CustomerService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var customers []models.Customer
	var total int64

	query := s.db.Model(&models.Customer{})

	if searchTerm != "" {
		query = query.Where("name LIKE ? OR phone LIKE ? OR email LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	// Validate sortBy to prevent SQL injection and errors
	validSortFields := map[string]bool{
		"id": true, "name": true, "phone": true, "email": true, 
		"address": true, "created_at": true, "updated_at": true,
	}
	if !validSortFields[sortBy] {
		sortBy = "id"
	}
	
	// Validate orderBy
	if orderBy != "asc" && orderBy != "desc" {
		orderBy = "asc"
	}

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&customers).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        customers,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *CustomerService) GetID(id string) (models.Customer, error) {
	var customer models.Customer
	if err := s.db.First(&customer, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return customer, errors.New("customer not found")
		}
		return customer, err
	}
	return customer, nil
}

func (s *CustomerService) Create(customer models.Customer) (models.Customer, error) {
	if err := s.db.Create(&customer).Error; err != nil {
		return customer, err
	}
	return customer, nil
}

func (s *CustomerService) Update(customer models.Customer) (models.Customer, error) {
	if err := s.db.Save(&customer).Error; err != nil {
		return customer, err
	}
	return customer, nil
}

func (s *CustomerService) Delete(customer models.Customer) error {
	if err := s.db.Delete(&customer).Error; err != nil {
		return err
	}
	return nil
}
