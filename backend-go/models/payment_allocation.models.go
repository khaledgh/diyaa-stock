package models

import "time"

type PaymentAllocation struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	PaymentID       uint      `json:"payment_id" gorm:"not null;index"`
	InvoiceID       uint      `json:"invoice_id" gorm:"not null;index"`
	InvoiceType     string    `json:"invoice_type" gorm:"size:20;not null"` // sales, purchase
	AllocatedAmount float64   `json:"allocated_amount" gorm:"type:decimal(15,2);not null"`
	InvoiceStatus   string    `json:"invoice_status" gorm:"size:20"` // paid, partial - status after allocation
	AllocationDate  time.Time `json:"allocation_date" gorm:"not null"`
	CreatedAt       time.Time `json:"created_at"`

	// Relationships
	Payment Payment `json:"payment,omitempty" gorm:"foreignKey:PaymentID"`
}

// TableName specifies the table name for PaymentAllocation
func (PaymentAllocation) TableName() string {
	return "payment_allocations"
}
