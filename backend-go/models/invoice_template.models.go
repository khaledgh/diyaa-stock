package models

import (
	"time"
)

type InvoiceTemplate struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Name        string     `json:"name" gorm:"size:100;not null"`
	Type        string     `json:"type" gorm:"size:20;default:invoice"` // invoice, report, statement
	Fields      string     `json:"fields" gorm:"type:text"` // JSON array of field IDs
	Layout      string     `json:"layout" gorm:"type:text"` // JSON object of layout settings
	CustomTexts string     `json:"custom_texts" gorm:"type:text"` // JSON object of custom texts
	IsDefault   bool       `json:"is_default" gorm:"default:false"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
