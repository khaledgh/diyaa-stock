package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type ExpenseService struct {
	db *gorm.DB
}

func NewExpenseService(db *gorm.DB) *ExpenseService {
	return &ExpenseService{db: db}
}

func (s *ExpenseService) GetAll(page, pageSize int, search string, categoryID *uint, startDate, endDate *time.Time) ([]models.Expense, int64, error) {
	var expenses []models.Expense
	var total int64

	query := s.db.Model(&models.Expense{}).
		Preload("ExpenseCategory").
		Preload("Vendor").
		Preload("CreatedByUser")

	if search != "" {
		query = query.Where("expense_number LIKE ? OR notes LIKE ? OR reference_number LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if categoryID != nil {
		query = query.Where("expense_category_id = ?", categoryID)
	}

	if startDate != nil {
		query = query.Where("expense_date >= ?", startDate)
	}

	if endDate != nil {
		query = query.Where("expense_date <= ?", endDate)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if pageSize > 0 {
		offset := (page - 1) * pageSize
		query = query.Offset(offset).Limit(pageSize)
	}

	err = query.Order("expense_date desc, id desc").Find(&expenses).Error
	return expenses, total, err
}

func (s *ExpenseService) GetByID(id uint) (*models.Expense, error) {
	var expense models.Expense
	err := s.db.Model(&models.Expense{}).
		Preload("ExpenseCategory").
		Preload("Vendor").
		Preload("CreatedByUser").
		First(&expense, id).Error
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (s *ExpenseService) Create(expense *models.Expense) error {
	// Generate expense number if not provided
	if expense.ExpenseNumber == "" {
		var count int64
		s.db.Model(&models.Expense{}).Count(&count)
		expense.ExpenseNumber = fmt.Sprintf("EXP-%06d", count+1)
	}

	return s.db.Create(expense).Error
}

func (s *ExpenseService) Update(id uint, updates map[string]interface{}) (*models.Expense, error) {
	var expense models.Expense
	if err := s.db.First(&expense, id).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&expense).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Reload to get associations
	return s.GetByID(id)
}

func (s *ExpenseService) Delete(id uint) error {
	return s.db.Delete(&models.Expense{}, id).Error
}

type ExpenseCategoryService struct {
	db *gorm.DB
}

func NewExpenseCategoryService(db *gorm.DB) *ExpenseCategoryService {
	return &ExpenseCategoryService{db: db}
}

func (s *ExpenseCategoryService) GetAll(onlyActive bool) ([]models.ExpenseCategory, error) {
	var categories []models.ExpenseCategory
	query := s.db.Model(&models.ExpenseCategory{})

	if onlyActive {
		query = query.Where("is_active = ?", true)
	}

	err := query.Order("name_en asc").Find(&categories).Error
	return categories, err
}

func (s *ExpenseCategoryService) GetByID(id uint) (*models.ExpenseCategory, error) {
	var category models.ExpenseCategory
	err := s.db.First(&category, id).Error
	return &category, err
}

func (s *ExpenseCategoryService) Create(category *models.ExpenseCategory) error {
	return s.db.Create(category).Error
}

func (s *ExpenseCategoryService) Update(id uint, updates map[string]interface{}) (*models.ExpenseCategory, error) {
	var category models.ExpenseCategory
	if err := s.db.First(&category, id).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&category).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &category, nil
}

func (s *ExpenseCategoryService) Delete(id uint) error {
	// Check if used in expenses
	var count int64
	s.db.Model(&models.Expense{}).Where("expense_category_id = ?", id).Count(&count)
	if count > 0 {
		return errors.New("cannot delete category referenced by expenses")
	}

	return s.db.Delete(&models.ExpenseCategory{}, id).Error
}
