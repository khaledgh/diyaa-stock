package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type EmployeeService interface {
	GetALL(limit, page int, orderBy, sortBy, searchTerm string) (services.PaginationResponse, error)
	GetID(id string) (models.Employee, error)
	Create(employee models.Employee) (models.Employee, error)
	Update(employee models.Employee) (models.Employee, error)
	Delete(employee models.Employee) error
}

type EmployeeHandler struct {
	EmployeeServices EmployeeService
}

func NewEmployeeHandler(es EmployeeService) *EmployeeHandler {
	return &EmployeeHandler{
		EmployeeServices: es,
	}
}

func (eh *EmployeeHandler) GetAllHandler(c echo.Context) error {
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
		sortBy = "full_name"
	}
	searchTerm := c.QueryParam("search")
	response, err := eh.EmployeeServices.GetALL(limit, page, orderBy, sortBy, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (eh *EmployeeHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := eh.EmployeeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (eh *EmployeeHandler) CreateHandler(c echo.Context) error {
	var employee models.Employee
	if err := c.Bind(&employee); err != nil {
		return ResponseError(c, err)
	}
	response, err := eh.EmployeeServices.Create(employee)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Employee created successfully", response)
}

func (eh *EmployeeHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")
	employee, err := eh.EmployeeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	if err = c.Bind(&employee); err != nil {
		return ResponseError(c, err)
	}

	response, err := eh.EmployeeServices.Update(employee)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Employee updated successfully", response)
}

func (eh *EmployeeHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	employee, err := eh.EmployeeServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	err = eh.EmployeeServices.Delete(employee)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Employee deleted successfully", nil)
}
