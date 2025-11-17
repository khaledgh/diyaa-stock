package models

import "time"

type Payment struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	InvoiceID         uint      `json:"invoice_id" gorm:"not null"`
	InvoiceType       string    `json:"invoice_type" gorm:"size:20"` // sales, purchase
	CustomerID        *uint     `json:"customer_id"`
	VendorID          *uint     `json:"vendor_id"`
	Amount            float64   `json:"amount" gorm:"not null"`
	PaymentMethod     string    `json:"payment_method" gorm:"size:20;not null"` // cash, card, bank_transfer
	ReferenceNumber   *string   `json:"reference_number" gorm:"size:100"`
	Notes             *string   `json:"notes" gorm:"type:text"`
	AllocationType    string    `json:"allocation_type" gorm:"size:20;default:'single'"` // single, multiple
	TotalAllocated    float64   `json:"total_allocated" gorm:"type:decimal(15,2);default:0"`
	UnallocatedAmount float64   `json:"unallocated_amount" gorm:"type:decimal(15,2);default:0"`
	CreatedBy         uint      `json:"created_by"`
	CreatedByUser     *User     `json:"created_by_user" gorm:"foreignKey:CreatedBy"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Relationships
	Customer    *Customer           `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	Vendor      *Vendor             `json:"vendor,omitempty" gorm:"foreignKey:VendorID"`
	Allocations []PaymentAllocation `json:"allocations,omitempty" gorm:"foreignKey:PaymentID"`
}
