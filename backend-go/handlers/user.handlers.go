package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	GetALL(limit, page int, orderBy, sortBy, status, role, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.User, error)
	GetEmail(email string) (models.User, error)
	Create(user models.User) (models.User, error)
	Update(user models.User) (models.User, error)
	UpdateToDelete(user models.User) (models.User, error)
}

type UserHandler struct {
	UserServices UserService
}

func NewUserHandler(us UserService) *UserHandler {
	return &UserHandler{
		UserServices: us,
	}
}

func (uh *UserHandler) GetAllHandler(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 20
	}
	orderBy := c.QueryParam("orderBy")
	if orderBy == "" {
		orderBy = "desc"
	}
	role := c.QueryParam("role")
	status := c.QueryParam("status")

	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "id"
	}
	searchTerm := c.QueryParam("searchTerm")
	response, err := uh.UserServices.GetALL(limit, page, orderBy, sortBy, status, role, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (uh *UserHandler) GetIDHandler(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	id := c.Param("id")
	user, err := uh.UserServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, user, "data")
}

func (uh *UserHandler) CreateHandler(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	var formData struct {
		Email          string  `json:"email" gorm:"unique"`
		FirstName      string  `json:"first_name"`
		LastName       string  `json:"last_name"`
		Phone          string  `json:"phone"`
		Address        string  `json:"address"`
		Status         string  `json:"status" gorm:"default:ACTIVE"`
		Password       string  `json:"password"`
		Role           string  `json:"role" gorm:"default:USER"`
		CommissionRate float64 `json:"commission_rate"`
	}

	if err = c.Bind(&formData); err != nil {
		log.Println("error", err.Error())
		return ResponseError(c, err)
	}
	user := models.User{
		Email:          formData.Email,
		FirstName:      formData.FirstName,
		LastName:       formData.LastName,
		Phone:          formData.Phone,
		Password:       formData.Password,
		Status:         formData.Status,
		Role:           formData.Role,
		CommissionRate: formData.CommissionRate,
	}

	if user.Email == "" {
		return ResponseError(c, errors.New("email is required"))
	}
	existingUser, err := uh.UserServices.GetEmail(user.Email)
	if err != nil {
		return ResponseError(c, err)
	}
	if existingUser.ID != 0 {
		return ResponseError(c, errors.New("email is already exist"))
	}
	log.Println("userPassword", len(user.Password))
	if user.Password == "" || len(user.Password) < 5 {
		return ResponseError(c, errors.New("password must be at least 6 characters"))
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)

	user, err = uh.UserServices.Create(user)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", user)
}

func (uh *UserHandler) UpdateHandler(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	id := c.Param("id")
	user, err := uh.UserServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Use DTO to handle flexible types from frontend
	var dto struct {
		Email          string  `json:"email"`
		FirstName      string  `json:"first_name"`
		LastName       string  `json:"last_name"`
		FullName       string  `json:"full_name"` // Frontend sends this
		Phone          string  `json:"phone"`
		Password       string  `json:"password"`
		Role           string  `json:"role"`
		Status         string  `json:"status"`
		IsActive       any     `json:"is_active"` // Frontend sends 1/0 or true/false
		Position       string  `json:"position"`
		HireDate       string  `json:"hire_date"`
		Salary         any     `json:"salary"` // Accept string or number
		Address        string  `json:"address"`
		VanID          any     `json:"van_id"`      // Accept string or number
		LocationID     any     `json:"location_id"` // Accept string or number
		CommissionRate float64 `json:"commission_rate"`
	}

	if err = c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}

	// Update user fields
	if dto.Email != "" {
		user.Email = dto.Email
	}
	user.Phone = dto.Phone
	if dto.Role != "" {
		user.Role = dto.Role
	}
	user.CommissionRate = dto.CommissionRate

	// Handle status from frontend (is_active: 1/0 or status: "ACTIVE"/"INACTIVE")
	if dto.Status != "" {
		user.Status = dto.Status
	}
	if dto.IsActive != nil {
		switch v := dto.IsActive.(type) {
		case float64:
			if v == 1 {
				user.Status = "ACTIVE"
			} else {
				user.Status = "INACTIVE"
			}
		case bool:
			if v {
				user.Status = "ACTIVE"
			} else {
				user.Status = "INACTIVE"
			}
		}
	}

	// Handle password update
	if dto.Password != "" {
		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
		if hashErr == nil {
			user.Password = string(hashedPassword)
		}
	}

	// Handle employee info fields
	if dto.HireDate != "" {
		user.HireDate = &dto.HireDate
	}
	if dto.Address != "" {
		user.Address = &dto.Address
	}
	// Handle salary (can be string or number from frontend)
	if dto.Salary != nil && dto.Salary != "" {
		switch v := dto.Salary.(type) {
		case float64:
			user.Salary = v
		case string:
			if parsed, parseErr := strconv.ParseFloat(v, 64); parseErr == nil {
				user.Salary = parsed
			}
		}
	}

	// Handle full_name splitting
	if dto.FullName != "" {
		// Split full name into first and last name
		parts := strings.Fields(strings.TrimSpace(dto.FullName))
		if len(parts) > 0 {
			user.FirstName = parts[0]
			if len(parts) > 1 {
				user.LastName = strings.Join(parts[1:], " ")
			} else {
				user.LastName = ""
			}
		}
	} else {
		// Use separate first_name and last_name if provided
		if dto.FirstName != "" {
			user.FirstName = dto.FirstName
		}
		if dto.LastName != "" {
			user.LastName = dto.LastName
		}
	}

	// Handle Position
	if dto.Position != "" {
		user.Position = &dto.Position
	}

	// Handle LocationID conversion
	if dto.LocationID != nil && dto.LocationID != "" {
		if locationID := convertToUintPtr(dto.LocationID); locationID != nil {
			user.LocationID = locationID
		}
	} else {
		user.LocationID = nil
	}

	user, err = uh.UserServices.Update(user)
	if err != nil {
		return ResponseError(c, err)
	}

	// Reload user from database to get complete updated record including commission_rate
	updatedUser, err := uh.UserServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "updated", updatedUser)
}

func (uh *UserHandler) UpdatePasswordHandler(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	id := c.Param("id")
	user, err := uh.UserServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	var formData struct {
		Password string `json:"password"`
	}
	if err = c.Bind(&formData); err != nil {
		return ResponseError(c, err)
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(formData.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)
	user, err = uh.UserServices.Update(user)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", user)
}

func (uh *UserHandler) UpdateToDelete(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	id := c.Param("id")
	user, err := uh.UserServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	if user.Status == "ACTIVE" {
		user.Status = "NOTACTIVE"
	} else {
		user.Status = "ACTIVE"
	}
	user, err = uh.UserServices.Update(user)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "updated", user)

}
