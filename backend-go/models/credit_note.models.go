package models

import "time"

type CreditNote struct {
	ID                uint       `json:"id" gorm:"primaryKey"`
	CreditNoteNumber  string     `json:"credit_note_number" gorm:"size:50;uniqueIndex;not null"`
	PurchaseInvoiceID *uint      `json:"purchase_invoice_id" gorm:"index"`
	VendorID          *uint      `json:"vendor_id" gorm:"index"`
	LocationID        uint       `json:"location_id" gorm:"not null;index"`
	CreditNoteDate    time.Time  `json:"credit_note_date" gorm:"not null"`
	TotalAmount       float64    `json:"total_amount" gorm:"type:decimal(15,2);not null"`
	Notes             string     `json:"notes" gorm:"type:text"`
	Status            string     `json:"status" gorm:"size:20;default:'draft'"` // draft, approved, cancelled
	CreatedBy         *uint      `json:"created_by" gorm:"index"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	PurchaseInvoice *PurchaseInvoice `json:"purchase_invoice,omitempty" gorm:"foreignKey:PurchaseInvoiceID"`
	Vendor          Vendor           `json:"vendor" gorm:"foreignKey:VendorID"`
	Location        Location         `json:"location" gorm:"foreignKey:LocationID"`
	Creator         *User            `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
	Items           []CreditNoteItem `json:"items" gorm:"foreignKey:CreditNoteID"`
}

type CreditNoteItem struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreditNoteID uint      `json:"credit_note_id" gorm:"not null;index"`
	ProductID    uint      `json:"product_id" gorm:"not null;index"`
	Quantity     float64   `json:"quantity" gorm:"not null"`
	UnitPrice    float64   `json:"unit_price" gorm:"type:decimal(15,2);not null"`
	Total        float64   `json:"total" gorm:"type:decimal(15,2);not null"`
	Reason       string    `json:"reason" gorm:"size:255"`
	CreatedAt    time.Time `json:"created_at"`

	// Relationships
	CreditNote CreditNote `json:"credit_note,omitempty" gorm:"foreignKey:CreditNoteID"`
	Product    Product    `json:"product" gorm:"foreignKey:ProductID"`
}

// TableName specifies the table name for CreditNote
func (CreditNote) TableName() string {
	return "credit_notes"
}

// TableName specifies the table name for CreditNoteItem
func (CreditNoteItem) TableName() string {
	return "credit_note_items"
}
