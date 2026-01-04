package models

import "time"

type ExpenseCategory struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	NameEn      string     `json:"name_en" gorm:"size:100;not null"`
	NameAr      *string    `json:"name_ar" gorm:"size:100"`
	Description *string    `json:"description" gorm:"type:text"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

type Expense struct {
	ID                uint             `json:"id" gorm:"primaryKey"`
	ExpenseNumber     string           `json:"expense_number" gorm:"size:50;unique;not null"`
	ExpenseCategoryID uint             `json:"expense_category_id" gorm:"not null"`
	ExpenseCategory   *ExpenseCategory `json:"expense_category,omitempty" gorm:"foreignKey:ExpenseCategoryID"`
	VendorID          *uint            `json:"vendor_id"`
	Vendor            *Vendor          `json:"vendor,omitempty" gorm:"foreignKey:VendorID"`
	Amount            float64          `json:"amount" gorm:"not null"`
	TaxAmount         float64          `json:"tax_amount" gorm:"default:0"`
	ExpenseDate       time.Time        `json:"expense_date" gorm:"not null"`
	PaymentMethod     string           `json:"payment_method" gorm:"size:20;not null"` // cash, card, bank_transfer
	ReferenceNumber   *string          `json:"reference_number" gorm:"size:100"`
	Notes             *string          `json:"notes" gorm:"type:text"`
	CreatedBy         uint             `json:"created_by"`
	CreatedByUser     *User            `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
	DeletedAt         *time.Time       `json:"deleted_at,omitempty" gorm:"index"`
}
