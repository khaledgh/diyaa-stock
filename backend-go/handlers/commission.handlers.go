package handlers

import (
	"net/http"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type CommissionHandler struct {
	DB *gorm.DB
}

func NewCommissionHandler(db *gorm.DB) *CommissionHandler {
	return &CommissionHandler{DB: db}
}

type CommissionResponse struct {
	UserID         uint    `json:"user_id"`
	Name           string  `json:"name"`
	CommissionRate float64 `json:"commission_rate"`
	TotalSales     float64 `json:"total_sales"`
	CommissionOwed float64 `json:"commission_owed"`
}

// GetCommissions calculates commission owed to each sales rep based on their
// commission_rate and the total sales invoices they created.
func (h *CommissionHandler) GetCommissions(c echo.Context) error {
	// 1. Get all sales-role users with a commission rate > 0
	var users []models.User
	if err := h.DB.Where("role = ? AND commission_rate > 0", "sales").Find(&users).Error; err != nil {
		return ResponseError(c, err)
	}

	results := make([]CommissionResponse, 0, len(users))

	for _, u := range users {
		// 2. Sum total_amount from sales invoices created by this user
		var totalSales float64
		row := h.DB.Model(&models.SalesInvoice{}).
			Where("created_by = ? AND deleted_at IS NULL", u.ID).
			Select("COALESCE(SUM(total_amount), 0)").Row()
		if err := row.Scan(&totalSales); err != nil {
			totalSales = 0
		}

		commissionOwed := totalSales * (u.CommissionRate / 100)

		name := u.FirstName + " " + u.LastName
		if name == " " {
			name = u.Email
		}

		results = append(results, CommissionResponse{
			UserID:         u.ID,
			Name:           name,
			CommissionRate: u.CommissionRate,
			TotalSales:     totalSales,
			CommissionOwed: commissionOwed,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"ok":   true,
		"data": results,
	})
}
