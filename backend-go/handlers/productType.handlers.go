package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type ProductTypeService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.ProductType, error)
	// GetEmail(email string) (models.User, error)
	Create(product models.ProductType) (models.ProductType, error)
	Update(product models.ProductType) (models.ProductType, error)
	Delete(product models.ProductType) error
}

type ProductTypeHandler struct {
	ProductTypeServices ProductTypeService
}

func NewProductTypeHandler(ps ProductTypeService) *ProductTypeHandler {
	return &ProductTypeHandler{
		ProductTypeServices: ps,
	}
}

func (ph *ProductTypeHandler) GetAllHandler(c echo.Context) error {
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
	response, err := ph.ProductTypeServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (ph *ProductTypeHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := ph.ProductTypeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (ph *ProductTypeHandler) CreateHandler(c echo.Context) error {
	var productType models.ProductType
	if err := c.Bind(&productType); err != nil {
		return ResponseError(c, err)
	}
	response, err := ph.ProductTypeServices.Create(productType)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", response)
}

func (ph *ProductTypeHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	productType, err := ph.ProductTypeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&productType); err != nil {
		return ResponseError(c, err)
	}

	response, err := ph.ProductTypeServices.Update(productType)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", response)
}

func (ph *ProductTypeHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	productType, err := ph.ProductTypeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ph.ProductTypeServices.Delete(productType)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}
