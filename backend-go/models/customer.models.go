package models

import "time"

type Customer struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Name        string     `json:"name" gorm:"size:100;not null"`
	Phone       *string    `json:"phone" gorm:"size:20"`
	Email       *string    `json:"email" gorm:"size:100"`
	Address     *string    `json:"address" gorm:"type:text"`
	TaxNumber   *string    `json:"tax_number" gorm:"size:50"`
	CreditLimit float64    `json:"credit_limit" gorm:"default:0"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
