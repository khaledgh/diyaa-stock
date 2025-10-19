package services

import (
	"errors"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type EmployeeService struct {
	model models.Employee
	db    *gorm.DB
}

func NewEmployeeService(model models.Employee, db *gorm.DB) *EmployeeService {
	return &EmployeeService{
		model: model,
		db:    db,
	}
}

func (s *EmployeeService) GetALL(limit, page int, orderBy, sortBy, searchTerm string) (PaginationResponse, error) {
	var employees []models.Employee
	var total int64

	query := s.db.Model(&models.Employee{})

	if searchTerm != "" {
		query = query.Where("full_name LIKE ? OR phone LIKE ? OR email LIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&employees).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        employees,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (s *EmployeeService) GetID(id string) (models.Employee, error) {
	var employee models.Employee
	if err := s.db.First(&employee, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return employee, errors.New("employee not found")
		}
		return employee, err
	}
	return employee, nil
}

func (s *EmployeeService) Create(employee models.Employee) (models.Employee, error) {
	if err := s.db.Create(&employee).Error; err != nil {
		return employee, err
	}
	return employee, nil
}

func (s *EmployeeService) Update(employee models.Employee) (models.Employee, error) {
	if err := s.db.Save(&employee).Error; err != nil {
		return employee, err
	}
	return employee, nil
}

func (s *EmployeeService) Delete(employee models.Employee) error {
	if err := s.db.Delete(&employee).Error; err != nil {
		return err
	}
	return nil
}
