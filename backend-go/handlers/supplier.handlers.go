package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type SupplierService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Supplier, error)
	Create(supplier models.Supplier) (models.Supplier, error)
	Update(supplier models.Supplier) (models.Supplier, error)
	Delete(supplier models.Supplier) error
}

type SupplierHandler struct {
	SupplierServices SupplierService
}

func NewSupplierHandler(cs SupplierService) *SupplierHandler {
	return &SupplierHandler{
		SupplierServices: cs,
	}
}

func (sh *SupplierHandler) GetAllHandler(c echo.Context) error {
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
	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "id"
	}
	searchTerm := c.QueryParam("searchTerm")
	response, err := sh.SupplierServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (sh *SupplierHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := sh.SupplierServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (sh *SupplierHandler) CreateHandler(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	var supplier models.Supplier
	if err = c.Bind(&supplier); err != nil {
		return ResponseError(c, err)
	}
	supplier.UserID = user.ID
	supplier.CompanyID = user.CompanyID
	response, err := sh.SupplierServices.Create(supplier)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", response)
}

func (sh *SupplierHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	supplier, err := sh.SupplierServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&supplier); err != nil {
		return ResponseError(c, err)
	}

	response, err := sh.SupplierServices.Update(supplier)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", response)
}

func (ch *SupplierHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	supplier, err := ch.SupplierServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ch.SupplierServices.Delete(supplier)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}
