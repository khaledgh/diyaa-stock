package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

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
		Email     string `json:"email" gorm:"unique"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Phone     string `json:"phone"`
		Address   string `json:"address"`
		Status    string `json:"status" gorm:"default:ACTIVE"`
		Password  string `json:"password"`
		Role      string `json:"role" gorm:"default:USER"`
	}

	if err = c.Bind(&formData); err != nil {
		log.Println("error", err.Error())
		return ResponseError(c, err)
	}
	user := models.User{
		Email:     formData.Email,
		FirstName: formData.FirstName,
		LastName:  formData.LastName,
		Phone:     formData.Phone,
		Password:  formData.Password,
		Status:    formData.Status,
		Role:      formData.Role,
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
		Email      string `json:"email"`
		FirstName  string `json:"first_name"`
		LastName   string `json:"last_name"`
		Phone      string `json:"phone"`
		Role       string `json:"role"`
		Status     string `json:"status"`
		Position   string `json:"position"`
		VanID      any    `json:"van_id"`      // Accept string or number
		LocationID any    `json:"location_id"` // Accept string or number
	}
	
	if err = c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}
	
	// Update user fields
	user.Email = dto.Email
	user.FirstName = dto.FirstName
	user.LastName = dto.LastName
	user.Phone = dto.Phone
	user.Role = dto.Role
	user.Status = dto.Status
	
	// Handle Position
	if dto.Position != "" {
		user.Position = &dto.Position
	}
	
	// Handle VanID conversion
	if dto.VanID != nil && dto.VanID != "" {
		if vanID := convertToUintPtr(dto.VanID); vanID != nil {
			user.VanID = vanID
		}
	} else {
		user.VanID = nil
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
	return ResponseSuccess(c, "updated", user)
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
