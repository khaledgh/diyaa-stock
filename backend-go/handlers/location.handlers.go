package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type LocationService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Location, error)
	Create(location models.Location) (models.Location, error)
	Update(location models.Location) (models.Location, error)
	Delete(location models.Location) error
}

type LocationHandler struct {
	LocationServices LocationService
}

func NewLocationHandler(ls LocationService) *LocationHandler {
	return &LocationHandler{
		LocationServices: ls,
	}
}

func (lh *LocationHandler) GetAllHandler(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("per_page"))
	if limit <= 0 {
		limit = 20
	}
	orderBy := c.QueryParam("orderBy")
	if orderBy == "" {
		orderBy = "asc"
	}
	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "name"
	}
	searchTerm := c.QueryParam("search")
	response, err := lh.LocationServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (lh *LocationHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := lh.LocationServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (lh *LocationHandler) CreateHandler(c echo.Context) error {
	// Use DTO to handle van_id from frontend
	var dto struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Address     string `json:"address"`
		Phone       string `json:"phone"`
		ManagerName string `json:"manager_name"`
		VanID       any    `json:"van_id"` // Accept string or number
		IsActive    bool   `json:"is_active"`
	}
	
	if err := c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}
	
	// Create location with converted fields
	location := models.Location{
		Name:     dto.Name,
		Type:     dto.Type,
		IsActive: dto.IsActive,
	}
	
	if dto.Address != "" {
		location.Address = &dto.Address
	}
	if dto.Phone != "" {
		location.Phone = &dto.Phone
	}
	if dto.ManagerName != "" {
		location.ManagerName = &dto.ManagerName
	}
	
	// Convert van_id
	if dto.VanID != nil && dto.VanID != "" {
		location.VanID = convertToUintPtr(dto.VanID)
	}
	
	response, err := lh.LocationServices.Create(location)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Location created successfully", response)
}

func (lh *LocationHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	location, err := lh.LocationServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Use DTO to handle van_id from frontend
	var dto struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Address     string `json:"address"`
		Phone       string `json:"phone"`
		ManagerName string `json:"manager_name"`
		VanID       any    `json:"van_id"` // Accept string or number
		IsActive    bool   `json:"is_active"`
	}
	
	if err = c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}
	
	// Update location fields
	location.Name = dto.Name
	location.Type = dto.Type
	location.IsActive = dto.IsActive
	
	if dto.Address != "" {
		location.Address = &dto.Address
	} else {
		location.Address = nil
	}
	
	if dto.Phone != "" {
		location.Phone = &dto.Phone
	} else {
		location.Phone = nil
	}
	
	if dto.ManagerName != "" {
		location.ManagerName = &dto.ManagerName
	} else {
		location.ManagerName = nil
	}
	
	// Convert van_id
	if dto.VanID != nil && dto.VanID != "" {
		location.VanID = convertToUintPtr(dto.VanID)
	} else {
		location.VanID = nil
	}

	response, err := lh.LocationServices.Update(location)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Location updated successfully", response)
}

func (lh *LocationHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	location, err := lh.LocationServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = lh.LocationServices.Delete(location)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Location deleted successfully", nil)
}
