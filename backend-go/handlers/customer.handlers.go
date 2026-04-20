package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type CustomerService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Customer, error)
	Create(customer models.Customer) (models.Customer, error)
	Update(customer models.Customer) (models.Customer, error)
	Delete(customer models.Customer) error
}

type CustomerHandler struct {
	CustomerServices CustomerService
	DB               *gorm.DB
}

func NewCustomerHandler(cs CustomerService, db ...*gorm.DB) *CustomerHandler {
	h := &CustomerHandler{
		CustomerServices: cs,
	}
	if len(db) > 0 {
		h.DB = db[0]
	}
	return h
}

func (ch *CustomerHandler) GetAllHandler(c echo.Context) error {
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
	response, err := ch.CustomerServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (ch *CustomerHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := ch.CustomerServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (ch *CustomerHandler) CreateHandler(c echo.Context) error {
	// Use DTO to handle flexible types from frontend
	var dto struct {
		Name           string  `json:"name"`
		Phone          string  `json:"phone"`
		Email          string  `json:"email"`
		Address        string  `json:"address"`
		TaxNumber      string  `json:"tax_number"`
		CreditLimit    any     `json:"credit_limit"` // Accept string or number
		OpeningBalance float64 `json:"opening_balance"`
		IsActive       bool    `json:"is_active"`
	}

	if err := c.Bind(&dto); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid customer data: "+err.Error())
	}

	// Validate required fields
	if dto.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Customer name is required")
	}

	// Create customer with converted fields
	customer := models.Customer{
		Name:           dto.Name,
		IsActive:       dto.IsActive,
		OpeningBalance: dto.OpeningBalance,
		Balance:        dto.OpeningBalance, // Initial balance = opening balance
	}

	if dto.Phone != "" {
		customer.Phone = &dto.Phone
	}
	if dto.Email != "" {
		customer.Email = &dto.Email
	}
	if dto.Address != "" {
		customer.Address = &dto.Address
	}
	if dto.TaxNumber != "" {
		customer.TaxNumber = &dto.TaxNumber
	}

	// Convert credit_limit
	customer.CreditLimit = convertToFloat64(dto.CreditLimit)

	response, err := ch.CustomerServices.Create(customer)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create customer: "+err.Error())
	}
	return ResponseSuccess(c, "Customer created successfully", response)
}

func (ch *CustomerHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	customer, err := ch.CustomerServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	// Use DTO to handle flexible types from frontend
	var dto struct {
		Name           string  `json:"name"`
		Phone          string  `json:"phone"`
		Email          string  `json:"email"`
		Address        string  `json:"address"`
		TaxNumber      string  `json:"tax_number"`
		CreditLimit    any     `json:"credit_limit"` // Accept string or number
		OpeningBalance float64 `json:"opening_balance"`
		Balance        float64 `json:"balance"`
		IsActive       bool    `json:"is_active"`
	}

	if err = c.Bind(&dto); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid customer data: "+err.Error())
	}

	// Update customer fields
	customer.Name = dto.Name
	customer.IsActive = dto.IsActive
	customer.OpeningBalance = dto.OpeningBalance
	if dto.Balance != 0 {
		customer.Balance = dto.Balance
	}

	if dto.Phone != "" {
		customer.Phone = &dto.Phone
	} else {
		customer.Phone = nil
	}

	if dto.Email != "" {
		customer.Email = &dto.Email
	} else {
		customer.Email = nil
	}

	if dto.Address != "" {
		customer.Address = &dto.Address
	} else {
		customer.Address = nil
	}

	if dto.TaxNumber != "" {
		customer.TaxNumber = &dto.TaxNumber
	} else {
		customer.TaxNumber = nil
	}

	// Convert credit_limit
	customer.CreditLimit = convertToFloat64(dto.CreditLimit)

	response, err := ch.CustomerServices.Update(customer)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Customer updated successfully", response)
}

func (ch *CustomerHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	customer, err := ch.CustomerServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ch.CustomerServices.Delete(customer)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Customer deleted successfully", nil)
}

// AdjustBalanceHandler applies a manual debit or credit balance adjustment for a customer
func (ch *CustomerHandler) AdjustBalanceHandler(c echo.Context) error {
	id := c.Param("id")
	if ch.DB == nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Database not available")
	}

	var req struct {
		Amount float64 `json:"amount"`
		Type   string  `json:"type"` // "debit" adds to balance, "credit" reduces balance
		Reason string  `json:"reason"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request: "+err.Error())
	}
	if req.Amount <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Amount must be greater than zero")
	}
	if req.Type != "debit" && req.Type != "credit" {
		return echo.NewHTTPError(http.StatusBadRequest, "Type must be 'debit' or 'credit'")
	}

	customer, err := ch.CustomerServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	if req.Type == "debit" {
		customer.Balance += req.Amount
	} else {
		customer.Balance -= req.Amount
		if customer.Balance < 0 {
			customer.Balance = 0
		}
	}

	updated, err := ch.CustomerServices.Update(customer)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "Customer balance adjusted successfully", updated)
}
