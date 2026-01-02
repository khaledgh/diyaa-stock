package handlers

import (
	"errors"
	"fmt"
	"log"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type TransferService interface {
	GetALL(status, fromDate, toDate string) ([]models.Transfer, error)
	GetID(id string) (models.Transfer, error)
	Create(transfer models.Transfer) (models.Transfer, error)
}

type TransferHandler struct {
	TransferServices TransferService
	StockServices    StockService
}

func NewTransferHandler(ts TransferService, ss StockService) *TransferHandler {
	return &TransferHandler{
		TransferServices: ts,
		StockServices:    ss,
	}
}
func (th *TransferHandler) GetAllHandler(c echo.Context) error {
	status := c.QueryParam("status")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	transfers, err := th.TransferServices.GetALL(status, fromDate, toDate)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, transfers, "data")
}

func (th *TransferHandler) GetIDHandler(c echo.Context) error {
	id := c.Param("id")
	transfer, err := th.TransferServices.GetID(id)
	if err != nil {
		return ResponseError(c, err)
	}
	return ResponseOK(c, transfer, "data")
}

func (th *TransferHandler) CreateHandler(c echo.Context) error {
	var req struct {
		FromLocationType string `json:"from_location_type"`
		FromLocationID   uint   `json:"from_location_id"`
		ToLocationType   string `json:"to_location_type"`
		ToLocationID     uint   `json:"to_location_id"`
		Notes            string `json:"notes"`
		Items            []struct {
			ProductID uint    `json:"product_id"`
			Quantity  float64 `json:"quantity"`
		} `json:"items"`
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Validate items
	if len(req.Items) == 0 {
		return ResponseError(c, errors.New("transfer must have at least one item"))
	}

	// Validate location IDs
	if req.FromLocationID == 0 {
		return ResponseError(c, errors.New("from_location_id is required and cannot be 0"))
	}
	if req.ToLocationID == 0 {
		return ResponseError(c, errors.New("to_location_id is required and cannot be 0"))
	}
	if req.FromLocationType == "" {
		return ResponseError(c, errors.New("from_location_type is required"))
	}
	if req.ToLocationType == "" {
		return ResponseError(c, errors.New("to_location_type is required"))
	}

	log.Printf("[TRANSFER] Creating transfer from %s (ID: %d) to %s (ID: %d)",
		req.FromLocationType, req.FromLocationID, req.ToLocationType, req.ToLocationID)

	// Get user from context
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	// Validate stock availability
	for _, item := range req.Items {
		log.Printf("[TRANSFER] Checking stock for Product ID: %d, Location Type: %s, Location ID: %d, Required Quantity: %.2f",
			item.ProductID, req.FromLocationType, req.FromLocationID, item.Quantity)

		stock, err := th.StockServices.GetProductStock(item.ProductID, req.FromLocationType, req.FromLocationID)

		if err != nil {
			log.Printf("[TRANSFER] Error getting stock: %v", err)
			return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d at %s (ID: %d): %v",
				item.ProductID, req.FromLocationType, req.FromLocationID, err))
		}

		if stock == nil {
			log.Printf("[TRANSFER] Stock record not found for Product ID: %d at %s (ID: %d)",
				item.ProductID, req.FromLocationType, req.FromLocationID)
			return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d: no stock record found at %s (ID: %d)",
				item.ProductID, req.FromLocationType, req.FromLocationID))
		}

		log.Printf("[TRANSFER] Found stock - Product ID: %d, Available Quantity: %.2f, Required: %.2f",
			item.ProductID, stock.Quantity, item.Quantity)

		// Use a small epsilon to handle floating point precision issues
		if item.Quantity > stock.Quantity+0.00001 {
			log.Printf("[TRANSFER] Insufficient quantity - Product ID: %d, Available: %.2f, Required: %.2f",
				item.ProductID, stock.Quantity, item.Quantity)
			return ResponseError(c, fmt.Errorf("insufficient stock for product ID %d at %s (ID: %d): available %.2f, required %.2f",
				item.ProductID, req.FromLocationType, req.FromLocationID, stock.Quantity, item.Quantity))
		}
	}

	// Create transfer
	transfer := models.Transfer{
		FromLocationType: req.FromLocationType,
		FromLocationID:   req.FromLocationID,
		ToLocationType:   req.ToLocationType,
		ToLocationID:     req.ToLocationID,
		Status:           "completed",
		Notes:            &req.Notes,
		CreatedBy:        user.ID,
	}

	// Add items
	for _, item := range req.Items {
		transfer.Items = append(transfer.Items, models.TransferItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		})
	}

	// Create transfer in database
	createdTransfer, err := th.TransferServices.Create(transfer)
	if err != nil {
		return ResponseError(c, err)
	}

	// Update stock for each item
	for _, item := range req.Items {
		// Reduce from source
		if err := th.StockServices.UpdateStock(item.ProductID, req.FromLocationType, req.FromLocationID, -item.Quantity); err != nil {
			log.Printf("[TRANSFER] Error reducing stock: %v", err)
			return ResponseError(c, err)
		}

		// Add to destination
		if err := th.StockServices.UpdateStock(item.ProductID, req.ToLocationType, req.ToLocationID, item.Quantity); err != nil {
			log.Printf("[TRANSFER] Error adding stock: %v", err)
			return ResponseError(c, err)
		}

		// Create stock movement record
		notes := fmt.Sprintf("Transfer #%d", createdTransfer.ID)
		if err := th.StockServices.CreateMovement(
			item.ProductID,
			"transfer",
			item.Quantity,
			req.FromLocationType,
			req.FromLocationID,
			req.ToLocationType,
			req.ToLocationID,
			notes,
			user.ID,
		); err != nil {
			log.Printf("[TRANSFER] Error creating movement record: %v", err)
			// Don't fail the transfer if movement recording fails, just log it
		}
	}

	log.Printf("[TRANSFER] Transfer #%d completed successfully with %d items", createdTransfer.ID, len(req.Items))
	return ResponseSuccess(c, "Transfer completed successfully", createdTransfer)
}
