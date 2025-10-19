package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type CategoryService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Category, error)
	Create(category models.Category) (models.Category, error)
	Update(category models.Category) (models.Category, error)
	Delete(category models.Category) error
}

type CategoryHandler struct {
	CategoryServices CategoryService
}

func NewCategoryHandler(cs CategoryService) *CategoryHandler {
	return &CategoryHandler{
		CategoryServices: cs,
	}
}

func (ch *CategoryHandler) GetAllHandler(c echo.Context) error {
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
	response, err := ch.CategoryServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (ch *CategoryHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := ch.CategoryServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (ch *CategoryHandler) CreateHandler(c echo.Context) error {
	var category models.Category
	if err := c.Bind(&category); err != nil {
		return ResponseError(c, err)
	}
	response, err := ch.CategoryServices.Create(category)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "created", response)
}

func (ch *CategoryHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	category, err := ch.CategoryServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&category); err != nil {
		return ResponseError(c, err)
	}

	response, err := ch.CategoryServices.Update(category)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "updated", response)
}

func (ch *CategoryHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	category, err := ch.CategoryServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = ch.CategoryServices.Delete(category)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}
