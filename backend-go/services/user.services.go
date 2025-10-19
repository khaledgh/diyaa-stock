package services

import (
	"log"
	"math"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type UserService struct {
	User models.User
	DB   *gorm.DB
}

func NewUserService(u models.User, db *gorm.DB) *UserService {
	return &UserService{
		User: u,
		DB:   db,
	}
}

func (us *UserService) GetALL(limit, page int, orderBy, sortBy, status, role, searchTerm string) (PaginationResponse, error) {
	users := []models.User{}
	var totalRecords int64
	
	query := us.DB.Model(&models.User{})
	if searchTerm != "" {
		searchTermWithWildcard := "%" + searchTerm + "%"
		query = query.Where("email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?", searchTermWithWildcard, searchTermWithWildcard, searchTermWithWildcard, searchTermWithWildcard)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if role != "" {
		query = query.Where("role = ?", role)
	}

	query.Count(&totalRecords)
	
	offset := (page - 1) * limit
	if err := query.Order(sortBy + " " + orderBy).Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return PaginationResponse{}, err
	}
	
	totalPages := int(math.Ceil(float64(totalRecords) / float64(limit)))
	
	log.Println("response", users)
	
	return PaginationResponse{
		Data:        users,
		Total:       int(totalRecords),
		CurrentPage: page,
		PerPage:     limit,
		TotalPages:  totalPages,
	}, nil
}

func (us *UserService) GetID(id string) (models.User, error) {
	var user models.User
	if result := us.DB.First(&user, id); result.Error != nil {
		return models.User{}, result.Error
	}
	return user, nil
}

func (us *UserService) GetEmail(email string) (models.User, error) {
	var user models.User
	if result := us.DB.Where("email = ?", email).Find(&user); result.Error != nil {
		return models.User{}, result.Error
	}
	return user, nil
}

func (us *UserService) Create(user models.User) (models.User, error) {
	if result := us.DB.Create(&user); result.Error != nil {
		return models.User{}, result.Error
	}
	return user, nil
}

func (us *UserService) Update(user models.User) (models.User, error) {
	if result := us.DB.Model(&user).Updates(user); result.Error != nil {
		return models.User{}, result.Error
	}
	return user, nil
}

func (us *UserService) UpdateToDelete(user models.User) (models.User, error) {
	if result := us.DB.Save(&user); result.Error != nil {
		return models.User{}, result.Error
	}
	return user, nil
}
