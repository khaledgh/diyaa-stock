package models

import "time"

type Vendor struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	Name           string     `json:"name" gorm:"size:100;not null"`
	CompanyName    *string    `json:"company_name" gorm:"size:100"`
	Phone          *string    `json:"phone" gorm:"size:20"`
	Email          *string    `json:"email" gorm:"size:100"`
	Address        *string    `json:"address" gorm:"type:text"`
	TaxNumber      *string    `json:"tax_number" gorm:"size:50"`
	PaymentTerms   *string    `json:"payment_terms" gorm:"size:100"`
	OpeningBalance float64    `json:"opening_balance" gorm:"type:decimal(15,2);default:0"`
	Balance        float64    `json:"balance" gorm:"type:decimal(15,2);default:0"`
	IsActive       bool       `json:"is_active" gorm:"default:true"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" gorm:"index"`
	TotalPurchases int        `json:"total_purchases" gorm:"-"`
	TotalAmount    float64    `json:"total_amount" gorm:"-"`
}
