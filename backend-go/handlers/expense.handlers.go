package handlers

import (
	"math"
	"strconv"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type ExpenseHandler struct {
	service *services.ExpenseService
}

func NewExpenseHandler(service *services.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{service: service}
}

func (h *ExpenseHandler) GetAllHandler(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.QueryParam("limit"))
	if pageSize <= 0 {
		pageSize = 10
	}
	search := c.QueryParam("search")
	categoryID := c.QueryParam("category_id")
	startDateStr := c.QueryParam("start_date")
	endDateStr := c.QueryParam("end_date")

	var catID *uint
	if categoryID != "" {
		id, err := ParseUint(categoryID)
		if err != nil {
			return ResponseError(c, err)
		}
		catID = &id
	}

	var startDate, endDate *time.Time
	if startDateStr != "" {
		date, err := ParseDate(startDateStr)
		if err == nil {
			startDate = &date
		}
	}
	if endDateStr != "" {
		date, err := ParseDate(endDateStr)
		if err == nil {
			endDate = &date
		}
	}

	expenses, total, err := h.service.GetAll(page, pageSize, search, catID, startDate, endDate)
	if err != nil {
		return ResponseError(c, err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	response := map[string]interface{}{
		"data": expenses,
		"meta": map[string]interface{}{
			"current_page": page,
			"limit":        pageSize,
			"last_page":    totalPages,
			"total_count":  total,
		},
		"ok": true,
	}

	return c.JSON(200, response)
}

func (h *ExpenseHandler) GetByIDHandler(c echo.Context) error {
	id, err := ParseUint(c.Param("id"))
	if err != nil {
		return ResponseError(c, err)
	}

	expense, err := h.service.GetByID(id)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseOK(c, expense, "data")
}

func (h *ExpenseHandler) CreateHandler(c echo.Context) error {
	var expense models.Expense
	if err := c.Bind(&expense); err != nil {
		return ResponseError(c, err)
	}

	expense.CreatedBy = GetUserIDFromContext(c)

	// Ensure ExpenseDate is set, default to now if not
	if expense.ExpenseDate.IsZero() {
		expense.ExpenseDate = time.Now()
	}

	if err := h.service.Create(&expense); err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "created", expense)
}

func (h *ExpenseHandler) UpdateHandler(c echo.Context) error {
	id, err := ParseUint(c.Param("id"))
	if err != nil {
		return ResponseError(c, err)
	}

	var updates map[string]interface{}
	if err := c.Bind(&updates); err != nil {
		return ResponseError(c, err)
	}

	// Handle date parsing if present in updates
	if dateStr, ok := updates["expense_date"].(string); ok {
		date, err := ParseDate(dateStr)
		if err == nil {
			updates["expense_date"] = date
		}
	}

	updatedExpense, err := h.service.Update(id, updates)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "updated", updatedExpense)
}

func (h *ExpenseHandler) DeleteHandler(c echo.Context) error {
	id, err := ParseUint(c.Param("id"))
	if err != nil {
		return ResponseError(c, err)
	}

	if err := h.service.Delete(id); err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "deleted", nil)
}

type ExpenseCategoryHandler struct {
	service *services.ExpenseCategoryService
}

func NewExpenseCategoryHandler(service *services.ExpenseCategoryService) *ExpenseCategoryHandler {
	return &ExpenseCategoryHandler{service: service}
}

func (h *ExpenseCategoryHandler) GetAllHandler(c echo.Context) error {
	onlyActive := c.QueryParam("active") == "true"
	categories, err := h.service.GetAll(onlyActive)
	if err != nil {
		return ResponseError(c, err)
	}
	// Use custom response format or ResponseOK
	return ResponseOK(c, categories, "data")
}

func (h *ExpenseCategoryHandler) CreateHandler(c echo.Context) error {
	var category models.ExpenseCategory
	if err := c.Bind(&category); err != nil {
		return ResponseError(c, err)
	}

	if err := h.service.Create(&category); err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "created", category)
}

func (h *ExpenseCategoryHandler) UpdateHandler(c echo.Context) error {
	id, err := ParseUint(c.Param("id"))
	if err != nil {
		return ResponseError(c, err)
	}

	var updates map[string]interface{}
	if err := c.Bind(&updates); err != nil {
		return ResponseError(c, err)
	}

	updatedCategory, err := h.service.Update(id, updates)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "updated", updatedCategory)
}

func (h *ExpenseCategoryHandler) DeleteHandler(c echo.Context) error {
	id, err := ParseUint(c.Param("id"))
	if err != nil {
		return ResponseError(c, err)
	}

	if err := h.service.Delete(id); err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "deleted", nil)
}
