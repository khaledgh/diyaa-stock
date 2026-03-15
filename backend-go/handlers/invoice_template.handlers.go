package handlers

import (
	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type InvoiceTemplateHandler struct {
	DB *gorm.DB
}

func NewInvoiceTemplateHandler(db *gorm.DB) *InvoiceTemplateHandler {
	return &InvoiceTemplateHandler{DB: db}
}

func (h *InvoiceTemplateHandler) CreateTemplate(c echo.Context) error {
	var template models.InvoiceTemplate
	if err := c.Bind(&template); err != nil {
		return ResponseError(c, err)
	}

	if template.IsDefault {
		h.DB.Model(&models.InvoiceTemplate{}).Where("type = ?", template.Type).Update("is_default", false)
	}

	if err := h.DB.Create(&template).Error; err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "created", template)
}

func (h *InvoiceTemplateHandler) GetAllTemplates(c echo.Context) error {
	var templates []models.InvoiceTemplate
	h.DB.Find(&templates)
	return ResponseOK(c, templates, "data")
}

func (h *InvoiceTemplateHandler) GetDefaultTemplate(c echo.Context) error {
	templateType := c.QueryParam("type")
	if templateType == "" {
		templateType = "invoice"
	}

	var template models.InvoiceTemplate
	if err := h.DB.Where("type = ? AND is_default = ?", templateType, true).First(&template).Error; err != nil {
		return ResponseError(c, err)
	}

	return ResponseOK(c, template, "data")
}

func (h *InvoiceTemplateHandler) UpdateTemplate(c echo.Context) error {
	id := c.Param("id")
	var template models.InvoiceTemplate
	if err := h.DB.First(&template, id).Error; err != nil {
		return ResponseError(c, err)
	}

	if err := c.Bind(&template); err != nil {
		return ResponseError(c, err)
	}

	if template.IsDefault {
		h.DB.Model(&models.InvoiceTemplate{}).Where("type = ? AND id != ?", template.Type, id).Update("is_default", false)
	}

	if err := h.DB.Save(&template).Error; err != nil {
		return ResponseError(c, err)
	}

	return ResponseSuccess(c, "updated", template)
}

func (h *InvoiceTemplateHandler) DeleteTemplate(c echo.Context) error {
	id := c.Param("id")
	if err := h.DB.Delete(&models.InvoiceTemplate{}, id).Error; err != nil {
		return ResponseError(c, err)
	}
	return ResponseSuccess(c, "deleted", nil)
}
