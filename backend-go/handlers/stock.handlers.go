package handlers

import (
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type StockService interface {
	GetWarehouseStock() ([]map[string]interface{}, error)
	GetVanStock(vanID string) ([]map[string]interface{}, error)
	GetLocationStock(locationID string) ([]map[string]interface{}, error)
	GetAllStockByLocation() ([]map[string]interface{}, error)
	GetInventorySummary() ([]map[string]interface{}, error)
	GetMovements(productID, movementType, fromDate, toDate string, limit int) ([]models.StockMovement, error)
	CreateMovement(productID uint, movementType string, quantity float64, fromLocationType string, fromLocationID uint, toLocationType string, toLocationID uint, notes string, createdBy uint) error
	UpdateStock(productID uint, locationType string, locationID uint, quantity float64) error
	SetStock(productID uint, locationType string, locationID uint, quantity float64) error
	GetProductStock(productID uint, locationType string, locationID uint) (*models.Stock, error)
	GetLocationTypeAndID(locationID uint) (string, uint)
	GetDB() *gorm.DB
}

type StockHandler struct {
	StockServices StockService
}

func NewStockHandler(ss StockService) *StockHandler {
	return &StockHandler{
		StockServices: ss,
	}
}

func (sh *StockHandler) WarehouseStockHandler(c echo.Context) error {
	stock, err := sh.StockServices.GetWarehouseStock()
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, stock, "data")
}

func (sh *StockHandler) VanStockHandler(c echo.Context) error {
	vanID := c.Param("id")
	stock, err := sh.StockServices.GetVanStock(vanID)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, stock, "data")
}

func (sh *StockHandler) LocationStockHandler(c echo.Context) error {
	locationID := c.Param("id")
	stock, err := sh.StockServices.GetLocationStock(locationID)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, stock, "data")
}

func (sh *StockHandler) AllStockHandler(c echo.Context) error {
	stock, err := sh.StockServices.GetAllStockByLocation()
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, stock, "data")
}

func (sh *StockHandler) InventorySummaryHandler(c echo.Context) error {
	inventory, err := sh.StockServices.GetInventorySummary()
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, inventory, "data")
}

func (sh *StockHandler) MovementsHandler(c echo.Context) error {
	productID := c.QueryParam("product_id")
	movementType := c.QueryParam("movement_type")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")
	limit, _ := strconv.Atoi(c.QueryParam("limit"))

	movements, err := sh.StockServices.GetMovements(productID, movementType, fromDate, toDate, limit)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, movements, "data")
}

func (sh *StockHandler) AdjustStockHandler(c echo.Context) error {
	var req struct {
		ProductID    uint    `json:"product_id"`
		LocationType string  `json:"location_type"`
		LocationID   uint    `json:"location_id"`
		Quantity     float64 `json:"quantity"`
		Notes        string  `json:"notes"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Determine actual location type and ID
	locationType, locationID := sh.StockServices.GetLocationTypeAndID(req.LocationID)

	// Set stock to exact quantity
	err := sh.StockServices.SetStock(req.ProductID, locationType, locationID, req.Quantity)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "Stock adjusted successfully", nil)
}

func (sh *StockHandler) AddStockHandler(c echo.Context) error {
	var req struct {
		ProductID  uint    `json:"product_id"`
		LocationID uint    `json:"location_id"`
		Quantity   float64 `json:"quantity"`
		Notes      string  `json:"notes"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Determine actual location type and ID based on location
	locationType, locationID := sh.StockServices.GetLocationTypeAndID(req.LocationID)

	// Add to existing stock
	err := sh.StockServices.UpdateStock(req.ProductID, locationType, locationID, req.Quantity)
	if err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "Stock added successfully", nil)
}
