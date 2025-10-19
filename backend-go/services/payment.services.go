package services

import (
	"errors"
	"math"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type PaymentService struct {
	model models.Payment
	db    *gorm.DB
}

func NewPaymentService(model models.Payment, db *gorm.DB) *PaymentService {
	return &PaymentService{
		model: model,
		db:    db,
	}
}

func (s *PaymentService) GetALL(invoiceID string, limit int) ([]models.Payment, error) {
	var payments []models.Payment
	
	query := s.db.Model(&models.Payment{})
	
	if invoiceID != "" {
		query = query.Where("invoice_id = ?", invoiceID)
	}
	
	if limit > 0 {
		query = query.Limit(limit)
	} else {
		query = query.Limit(100)
	}
	
	err := query.Order("created_at DESC").Find(&payments).Error
	if err != nil {
		return nil, err
	}
	
	return payments, nil
}

func (s *PaymentService) GetID(id string) (models.Payment, error) {
	var payment models.Payment
	if err := s.db.Preload("CreatedByUser").First(&payment, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return payment, errors.New("payment not found")
		}
		return payment, err
	}
	return payment, nil
}

func (s *PaymentService) Create(payment models.Payment) (models.Payment, error) {
	if err := s.db.Create(&payment).Error; err != nil {
		return payment, err
	}
	return s.GetID(strconv.Itoa(int(payment.ID)))
}

func (s *PaymentService) GetPaginated(limit, page int, orderBy, sortBy, invoiceID string) (PaginationResponse, error) {
	var payments []models.Payment
	var total int64

	query := s.db.Model(&models.Payment{}).Preload("CreatedByUser")

	if invoiceID != "" {
		query = query.Where("invoice_id = ?", invoiceID)
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&payments).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        payments,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}
