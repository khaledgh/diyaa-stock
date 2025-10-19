package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type ProductService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Product, error)
	// GetEmail(email string) (models.User, error)
	Create(product models.Product) (models.Product, error)
	Update(product models.Product) (models.Product, error)
	Delete(product models.Product) error
}

type ProductHandler struct {
	ProductServices ProductService
}

func NewProductHandler(ps ProductService) *ProductHandler {
	return &ProductHandler{
		ProductServices: ps,
	}
}

func (ph *ProductHandler) GetAllHandler(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit <= 0 {
		limit = 1000 // Increased default limit for dropdowns
	}
	orderBy := c.QueryParam("orderBy")
	if orderBy == "" {
		orderBy = "asc"
	}
	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "name_en"
	}
	searchTerm := c.QueryParam("searchTerm")
	response, err := ph.ProductServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (ph *ProductHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := ph.ProductServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (ph *ProductHandler) CreateHandler(c echo.Context) error {
	// Use a flexible DTO to handle string or number values
	var dto struct {
		SKU           string  `json:"sku"`
		Barcode       *string `json:"barcode"`
		NameEn        string  `json:"name_en"`
		NameAr        *string `json:"name_ar"`
		Description   *string `json:"description"`
		CategoryID    any     `json:"category_id"`     // Accept string or number
		TypeID        any     `json:"type_id"`         // Accept string or number
		UnitPrice     any     `json:"unit_price"`      // Accept string or number
		CostPrice     any     `json:"cost_price"`      // Accept string or number
		Unit          string  `json:"unit"`
		MinStockLevel any     `json:"min_stock_level"` // Accept string or number
		IsActive      any     `json:"is_active"`       // Accept bool, number, or string
	}
	
	if err := c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}

	// Convert to Product model
	client := models.Product{
		SKU:         dto.SKU,
		Barcode:     dto.Barcode,
		NameEn:      dto.NameEn,
		NameAr:      dto.NameAr,
		Description: dto.Description,
		Unit:        dto.Unit,
	}

	// Convert numeric fields
	client.UnitPrice = convertToFloat64(dto.UnitPrice)
	client.CostPrice = convertToFloat64(dto.CostPrice)
	client.MinStockLevel = convertToInt(dto.MinStockLevel)
	client.IsActive = convertToBool(dto.IsActive)

	// Convert CategoryID (handle string or number)
	if dto.CategoryID != nil {
		if categoryID := convertToUintPtr(dto.CategoryID); categoryID != nil {
			client.CategoryID = categoryID
		}
	}

	// Convert TypeID (handle string or number)
	if dto.TypeID != nil {
		if typeID := convertToUintPtr(dto.TypeID); typeID != nil {
			client.TypeID = typeID
		}
	}

	response, err := ph.ProductServices.Create(client)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", response)
}

func (ph *ProductHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	client, err := ph.ProductServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Use a flexible DTO to handle string or number values
	var dto struct {
		SKU           string  `json:"sku"`
		Barcode       *string `json:"barcode"`
		NameEn        string  `json:"name_en"`
		NameAr        *string `json:"name_ar"`
		Description   *string `json:"description"`
		CategoryID    any     `json:"category_id"`     // Accept string or number
		TypeID        any     `json:"type_id"`         // Accept string or number
		UnitPrice     any     `json:"unit_price"`      // Accept string or number
		CostPrice     any     `json:"cost_price"`      // Accept string or number
		Unit          string  `json:"unit"`
		MinStockLevel any     `json:"min_stock_level"` // Accept string or number
		IsActive      any     `json:"is_active"`       // Accept bool, number, or string
	}

	if err = c.Bind(&dto); err != nil {
		return ResponseError(c, err)
	}

	// Update fields
	client.SKU = dto.SKU
	client.Barcode = dto.Barcode
	client.NameEn = dto.NameEn
	client.NameAr = dto.NameAr
	client.Description = dto.Description
	client.Unit = dto.Unit

	// Convert numeric fields
	client.UnitPrice = convertToFloat64(dto.UnitPrice)
	client.CostPrice = convertToFloat64(dto.CostPrice)
	client.MinStockLevel = convertToInt(dto.MinStockLevel)
	client.IsActive = convertToBool(dto.IsActive)

	// Convert CategoryID (handle string or number, including null)
	client.CategoryID = convertToUintPtr(dto.CategoryID)

	// Convert TypeID (handle string or number, including null)
	client.TypeID = convertToUintPtr(dto.TypeID)

	response, err := ph.ProductServices.Update(client)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", response)
}

func (ph *ProductHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	client, err := ph.ProductServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ph.ProductServices.Delete(client)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}

// convertToUintPtr converts various types to *uint
// Handles: string, float64, int, uint, or nil
func convertToUintPtr(value any) *uint {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case string:
		if v == "" || v == "0" {
			return nil
		}
		if num, err := strconv.ParseUint(v, 10, 32); err == nil {
			result := uint(num)
			return &result
		}
	case float64:
		if v == 0 {
			return nil
		}
		result := uint(v)
		return &result
	case int:
		if v == 0 {
			return nil
		}
		result := uint(v)
		return &result
	case uint:
		if v == 0 {
			return nil
		}
		return &v
	case *uint:
		return v
	}

	return nil
}

// convertToFloat64 converts various types to float64
// Handles: string, float64, int, or nil (returns 0)
func convertToFloat64(value any) float64 {
	if value == nil {
		return 0
	}

	switch v := value.(type) {
	case string:
		if v == "" {
			return 0
		}
		if num, err := strconv.ParseFloat(v, 64); err == nil {
			return num
		}
	case float64:
		return v
	case int:
		return float64(v)
	case uint:
		return float64(v)
	case int64:
		return float64(v)
	case uint64:
		return float64(v)
	}

	return 0
}

// convertToInt converts various types to int
// Handles: string, float64, int, or nil (returns 0)
func convertToInt(value any) int {
	if value == nil {
		return 0
	}

	switch v := value.(type) {
	case string:
		if v == "" {
			return 0
		}
		if num, err := strconv.Atoi(v); err == nil {
			return num
		}
	case float64:
		return int(v)
	case int:
		return v
	case uint:
		return int(v)
	case int64:
		return int(v)
	case uint64:
		return int(v)
	}

	return 0
}

// convertToBool converts various types to bool
// Handles: bool, number (0/1), string ("true"/"false"/"0"/"1"), or nil (returns true)
func convertToBool(value any) bool {
	if value == nil {
		return true // Default to active
	}

	switch v := value.(type) {
	case bool:
		return v
	case string:
		// Handle string representations
		if v == "true" || v == "1" || v == "True" || v == "TRUE" {
			return true
		}
		if v == "false" || v == "0" || v == "False" || v == "FALSE" || v == "" {
			return false
		}
		return true // Default to true for unknown strings
	case float64:
		return v != 0
	case int:
		return v != 0
	case uint:
		return v != 0
	case int64:
		return v != 0
	case uint64:
		return v != 0
	}

	return true // Default to active
}
