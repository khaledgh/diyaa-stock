package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type ProductBrandService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.ProductBrand, error)
	// GetEmail(email string) (models.User, error)
	Create(product models.ProductBrand) (models.ProductBrand, error)
	Update(product models.ProductBrand) (models.ProductBrand, error)
	Delete(product models.ProductBrand) error
}

type ProductBrandHandler struct {
	ProductBrandServices ProductBrandService
}

func NewProductBrandHandler(ps ProductBrandService) *ProductBrandHandler {
	return &ProductBrandHandler{
		ProductBrandServices: ps,
	}
}

func (ph *ProductBrandHandler) GetAllHandler(c echo.Context) error {
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
	response, err := ph.ProductBrandServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (ph *ProductBrandHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := ph.ProductBrandServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (ph *ProductBrandHandler) CreateHandler(c echo.Context) error {
	var productBrand models.ProductBrand
	if err := c.Bind(&productBrand); err != nil {
		return ResponseError(c, err)
	}
	response, err := ph.ProductBrandServices.Create(productBrand)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", response)
}

func (ph *ProductBrandHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	productBrand, err := ph.ProductBrandServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&productBrand); err != nil {
		return ResponseError(c, err)
	}

	response, err := ph.ProductBrandServices.Update(productBrand)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", response)
}

func (ph *ProductBrandHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	productBrand, err := ph.ProductBrandServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ph.ProductBrandServices.Delete(productBrand)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}
