package models

import "time"

type Payment struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	InvoiceID       uint      `json:"invoice_id" gorm:"not null"`
	Amount          float64   `json:"amount" gorm:"not null"`
	PaymentMethod   string    `json:"payment_method" gorm:"size:20;not null"` // cash, card, bank_transfer
	ReferenceNumber *string   `json:"reference_number" gorm:"size:100"`
	Notes           *string   `json:"notes" gorm:"type:text"`
	CreatedBy       uint      `json:"created_by"`
	CreatedByUser   *User     `json:"created_by_user" gorm:"foreignKey:CreatedBy"`
	CreatedAt       time.Time `json:"created_at"`
}
