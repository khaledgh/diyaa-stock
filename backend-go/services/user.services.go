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

	query := us.DB.Model(&models.User{}).Preload("Location")
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

	// Populate computed fields
	for i := range users {
		users[i].FullName = users[i].FirstName + " " + users[i].LastName
		users[i].IsActive = users[i].Status == "ACTIVE"
		if users[i].Location != nil {
			users[i].LocationName = users[i].Location.Name
		}
		us.loadUserLocations(&users[i])
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
	if result := us.DB.Preload("Location").First(&user, id); result.Error != nil {
		return models.User{}, result.Error
	}

	// Populate computed fields
	user.FullName = user.FirstName + " " + user.LastName
	user.IsActive = user.Status == "ACTIVE"
	if user.Location != nil {
		user.LocationName = user.Location.Name
	}
	us.loadUserLocations(&user)

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
	if result := us.DB.Save(&user); result.Error != nil {
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

// loadUserLocations loads multi-location assignments from user_locations junction table
func (us *UserService) loadUserLocations(user *models.User) {
	var userLocations []models.UserLocation
	us.DB.Where("user_id = ?", user.ID).Preload("Location").Find(&userLocations)
	user.Locations = make([]models.Location, 0, len(userLocations))
	user.LocationIDs = make([]uint, 0, len(userLocations))
	for _, ul := range userLocations {
		user.Locations = append(user.Locations, ul.Location)
		user.LocationIDs = append(user.LocationIDs, ul.LocationID)
	}
}

// SyncUserLocations replaces all location assignments for a user
func (us *UserService) SyncUserLocations(userID uint, locationIDs []uint) error {
	// Delete existing assignments
	if err := us.DB.Where("user_id = ?", userID).Delete(&models.UserLocation{}).Error; err != nil {
		return err
	}
	// Create new assignments
	for _, locID := range locationIDs {
		ul := models.UserLocation{UserID: userID, LocationID: locID}
		if err := us.DB.Create(&ul).Error; err != nil {
			return err
		}
	}
	return nil
}
