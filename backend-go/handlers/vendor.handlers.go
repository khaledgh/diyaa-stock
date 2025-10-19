package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type VendorService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Vendor, error)
	Create(vendor models.Vendor) (models.Vendor, error)
	Update(vendor models.Vendor) (models.Vendor, error)
	Delete(vendor models.Vendor) error
}

type VendorHandler struct {
	VendorServices VendorService
}

func NewVendorHandler(vs VendorService) *VendorHandler {
	return &VendorHandler{
		VendorServices: vs,
	}
}

func (vh *VendorHandler) GetAllHandler(c echo.Context) error {
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
	response, err := vh.VendorServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (vh *VendorHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := vh.VendorServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (vh *VendorHandler) CreateHandler(c echo.Context) error {
	var vendor models.Vendor
	if err := c.Bind(&vendor); err != nil {
		return ResponseError(c, err)
	}
	response, err := vh.VendorServices.Create(vendor)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Vendor created successfully", response)
}

func (vh *VendorHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	vendor, err := vh.VendorServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&vendor); err != nil {
		return ResponseError(c, err)
	}

	response, err := vh.VendorServices.Update(vendor)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Vendor updated successfully", response)
}

func (vh *VendorHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	vendor, err := vh.VendorServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = vh.VendorServices.Delete(vendor)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Vendor deleted successfully", nil)
}
