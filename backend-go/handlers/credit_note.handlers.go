package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
)

type CreditNoteService interface {
	GetAll(limit, page int, orderBy, sortBy, status, searchTerm string) (services.PaginationResponse, error)
	GetByID(id string) (models.CreditNote, error)
	Create(creditNote models.CreditNote) (models.CreditNote, error)
	Update(id string, creditNote models.CreditNote) (models.CreditNote, error)
	Approve(id string, approvedBy uint) (models.CreditNote, error)
	Cancel(id string) (models.CreditNote, error)
	Delete(id string) error
}

type CreditNoteHandler struct {
	CreditNoteService CreditNoteService
}

func NewCreditNoteHandler(cns CreditNoteService) *CreditNoteHandler {
	return &CreditNoteHandler{
		CreditNoteService: cns,
	}
}

func (h *CreditNoteHandler) GetAllHandler(c echo.Context) error {
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
		orderBy = "desc"
	}
	sortBy := c.QueryParam("sortBy")
	if sortBy == "" {
		sortBy = "created_at"
	}
	status := c.QueryParam("status")
	searchTerm := c.QueryParam("search")

	response, err := h.CreditNoteService.GetAll(limit, page, orderBy, sortBy, status, searchTerm)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return c.JSON(http.StatusOK, response)
}

func (h *CreditNoteHandler) GetByIDHandler(c echo.Context) error {
	id := c.Param("id")
	response, err := h.CreditNoteService.GetByID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, response, "data")
}

func (h *CreditNoteHandler) CreateHandler(c echo.Context) error {
	var creditNote models.CreditNote
	if err := c.Bind(&creditNote); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid credit note data: "+err.Error())
	}

	// Get user ID from context (assuming auth middleware sets this)
	userID := getUserIDFromContext(c)
	if userID > 0 {
		creditNote.CreatedBy = &userID
	}

	response, err := h.CreditNoteService.Create(creditNote)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Credit note created successfully", response)
}

func (h *CreditNoteHandler) UpdateHandler(c echo.Context) error {
	id := c.Param("id")

	var creditNote models.CreditNote
	if err := c.Bind(&creditNote); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid credit note data: "+err.Error())
	}

	response, err := h.CreditNoteService.Update(id, creditNote)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Credit note updated successfully", response)
}

func (h *CreditNoteHandler) ApproveHandler(c echo.Context) error {
	id := c.Param("id")

	// Get user ID from context - use 1 as default if not found
	userID := getUserIDFromContext(c)
	if userID == 0 {
		userID = 1 // Default to admin user
	}

	response, err := h.CreditNoteService.Approve(id, userID)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Credit note approved successfully", response)
}

func (h *CreditNoteHandler) CancelHandler(c echo.Context) error {
	id := c.Param("id")

	response, err := h.CreditNoteService.Cancel(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Credit note cancelled successfully", response)
}

func (h *CreditNoteHandler) DeleteHandler(c echo.Context) error {
	id := c.Param("id")

	err := h.CreditNoteService.Delete(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "Credit note deleted successfully", nil)
}

// getUserIDFromContext extracts user ID from the context
// This assumes your auth middleware sets the user info in the context
func getUserIDFromContext(c echo.Context) uint {
	// Try to get user from context (adjust based on your auth implementation)
	user := c.Get("user")
	if user != nil {
		if userModel, ok := user.(*models.User); ok {
			return userModel.ID
		}
		// If it's stored as a map or different structure, adjust accordingly
		if userMap, ok := user.(map[string]interface{}); ok {
			if id, ok := userMap["id"].(float64); ok {
				return uint(id)
			}
		}
	}
	return 0
}
