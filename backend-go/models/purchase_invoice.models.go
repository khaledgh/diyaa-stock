package models

import "time"

type PurchaseInvoice struct {
	ID            uint                  `json:"id" gorm:"primaryKey"`
	InvoiceNumber string                `json:"invoice_number" gorm:"size:50;unique;not null"`
	VendorID      *uint                 `json:"vendor_id"`
	Vendor        *Vendor               `json:"vendor,omitempty" gorm:"foreignKey:VendorID"`
	LocationID    uint                  `json:"location_id" gorm:"not null"`
	Location      *Location             `json:"location,omitempty" gorm:"foreignKey:LocationID"`
	InvoiceDate   time.Time             `json:"invoice_date" gorm:"not null"`
	TotalAmount   float64               `json:"total_amount" gorm:"not null"`
	PaidAmount    float64               `json:"paid_amount" gorm:"default:0"`
	PaymentStatus string                `json:"payment_status" gorm:"size:20;default:unpaid"` // unpaid, partial, paid
	PaymentMethod *string               `json:"payment_method" gorm:"size:20"`
	Notes         *string               `json:"notes" gorm:"type:text"`
	CreatedBy     uint                  `json:"created_by"`
	CreatedByUser *User                 `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	Items         []PurchaseInvoiceItem `json:"items,omitempty" gorm:"foreignKey:InvoiceID"`
	CreatedAt     time.Time             `json:"created_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
	DeletedAt     *time.Time            `json:"deleted_at,omitempty" gorm:"index"`
}

type PurchaseInvoiceItem struct {
	ID              uint     `json:"id" gorm:"primaryKey"`
	InvoiceID       uint     `json:"invoice_id" gorm:"not null"`
	ProductID       uint     `json:"product_id" gorm:"not null"`
	Product         *Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity        float64  `json:"quantity" gorm:"not null"`
	UnitPrice       float64  `json:"unit_price" gorm:"not null"`
	DiscountPercent float64  `json:"discount_percent" gorm:"default:0"`
	Total           float64  `json:"total" gorm:"not null"`
}
