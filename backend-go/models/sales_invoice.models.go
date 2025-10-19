package models

import "time"

type SalesInvoice struct {
	ID            uint               `json:"id" gorm:"primaryKey"`
	InvoiceNumber string             `json:"invoice_number" gorm:"size:50;unique;not null"`
	CustomerID    *uint              `json:"customer_id"`
	Customer      *Customer          `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	LocationID    uint               `json:"location_id" gorm:"not null"`
	Location      *Location          `json:"location,omitempty" gorm:"foreignKey:LocationID"`
	TotalAmount   float64            `json:"total_amount" gorm:"not null"`
	PaidAmount    float64            `json:"paid_amount" gorm:"default:0"`
	PaymentStatus string             `json:"payment_status" gorm:"size:20;default:unpaid"` // unpaid, partial, paid
	PaymentMethod *string            `json:"payment_method" gorm:"size:20"`
	Notes         *string            `json:"notes" gorm:"type:text"`
	CreatedBy     uint               `json:"created_by"`
	CreatedByUser *User              `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	Items         []SalesInvoiceItem `json:"items,omitempty" gorm:"foreignKey:InvoiceID"`
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
	DeletedAt     *time.Time         `json:"deleted_at,omitempty" gorm:"index"`
}

type SalesInvoiceItem struct {
	ID        uint     `json:"id" gorm:"primaryKey"`
	InvoiceID uint     `json:"invoice_id" gorm:"not null"`
	ProductID uint     `json:"product_id" gorm:"not null"`
	Product   *Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity  int      `json:"quantity" gorm:"not null"`
	UnitPrice float64  `json:"unit_price" gorm:"not null"`
	Total     float64  `json:"total" gorm:"not null"`
}
