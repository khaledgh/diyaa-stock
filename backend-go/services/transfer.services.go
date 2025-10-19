package services

import (
	"errors"
	"log"
	"math"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type TransferService struct {
	model models.Transfer
	db    *gorm.DB
}

func NewTransferService(model models.Transfer, db *gorm.DB) *TransferService {
	return &TransferService{
		model: model,
		db:    db,
	}
}

func (s *TransferService) GetALL(status, fromDate, toDate string) ([]models.Transfer, error) {
	var transfers []models.Transfer
	
	query := s.db.Model(&models.Transfer{}).
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product")
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	if fromDate != "" && toDate != "" {
		query = query.Where("DATE(created_at) BETWEEN ? AND ?", fromDate, toDate)
	}
	
	err := query.Order("created_at DESC").Find(&transfers).Error
	if err != nil {
		return nil, err
	}
	
	return transfers, nil
}

func (s *TransferService) GetID(id string) (models.Transfer, error) {
	var transfer models.Transfer
	if err := s.db.Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product").
		First(&transfer, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return transfer, errors.New("transfer not found")
		}
		return transfer, err
	}
	return transfer, nil
}

func (s *TransferService) Create(transfer models.Transfer) (models.Transfer, error) {
	if err := s.db.Create(&transfer).Error; err != nil {
		log.Printf("[TRANSFER SERVICE] Error creating transfer: %v", err)
		return transfer, err
	}
	
	log.Printf("[TRANSFER SERVICE] Transfer created successfully with ID: %d", transfer.ID)
	
	if transfer.ID == 0 {
		log.Printf("[TRANSFER SERVICE] Warning: Transfer ID is 0 after creation")
		return transfer, errors.New("transfer created but ID is 0")
	}
	
	return s.GetID(strconv.Itoa(int(transfer.ID)))
}

func (s *TransferService) Update(transfer models.Transfer) (models.Transfer, error) {
	if err := s.db.Save(&transfer).Error; err != nil {
		return transfer, err
	}
	return s.GetID(strconv.Itoa(int(transfer.ID)))
}

func (s *TransferService) Delete(transfer models.Transfer) error {
	if err := s.db.Delete(&transfer).Error; err != nil {
		return err
	}
	return nil
}

func (s *TransferService) GetPaginated(limit, page int, orderBy, sortBy, status string) (PaginationResponse, error) {
	var transfers []models.Transfer
	var total int64

	query := s.db.Model(&models.Transfer{}).
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Limit(limit).Offset(offset).Find(&transfers).Error; err != nil {
		return PaginationResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return PaginationResponse{
		Data:        transfers,
		Total:       int(total),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}
