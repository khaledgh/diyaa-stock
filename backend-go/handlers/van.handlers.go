package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type VanService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Van, error)
	Create(van models.Van) (models.Van, error)
	Update(van models.Van) (models.Van, error)
	Delete(van models.Van) error
}

type VanHandler struct {
	VanServices VanService
}

func NewVanHandler(vs VanService) *VanHandler {
	return &VanHandler{
		VanServices: vs,
	}
}

func (vh *VanHandler) GetAllHandler(c echo.Context) error {
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
	response, err := vh.VanServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (vh *VanHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := vh.VanServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (vh *VanHandler) CreateHandler(c echo.Context) error {
	// Use DTO to handle employee_id from frontend
	var dto struct {
		Name        string `json:"name"`
		PlateNumber string `json:"plate_number"`
		OwnerType   string `json:"owner_type"`
		EmployeeID  any    `json:"employee_id"` // Accept string or number
		IsActive    bool   `json:"is_active"`
	}
	
	if err := c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}
	
	// Create van with converted fields
	van := models.Van{
		Name:      dto.Name,
		OwnerType: dto.OwnerType,
		IsActive:  dto.IsActive,
	}
	
	if dto.PlateNumber != "" {
		van.PlateNumber = &dto.PlateNumber
	}
	
	// Convert employee_id to user_id
	if dto.EmployeeID != nil && dto.EmployeeID != "" {
		van.UserID = convertToUintPtr(dto.EmployeeID)
	}
	
	response, err := vh.VanServices.Create(van)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Van created successfully", response)
}

func (vh *VanHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	van, err := vh.VanServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	
	// Use DTO to handle employee_id from frontend
	var dto struct {
		Name        string `json:"name"`
		PlateNumber string `json:"plate_number"`
		OwnerType   string `json:"owner_type"`
		EmployeeID  any    `json:"employee_id"` // Accept string or number
		IsActive    bool   `json:"is_active"`
	}
	
	if err = c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}
	
	// Update van fields
	van.Name = dto.Name
	van.OwnerType = dto.OwnerType
	van.IsActive = dto.IsActive
	
	if dto.PlateNumber != "" {
		van.PlateNumber = &dto.PlateNumber
	} else {
		van.PlateNumber = nil
	}
	
	// Convert employee_id to user_id
	if dto.EmployeeID != nil && dto.EmployeeID != "" {
		van.UserID = convertToUintPtr(dto.EmployeeID)
	} else {
		van.UserID = nil
	}

	response, err := vh.VanServices.Update(van)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Van updated successfully", response)
}

func (vh *VanHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	van, err := vh.VanServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = vh.VanServices.Delete(van)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Van deleted successfully", nil)
}
