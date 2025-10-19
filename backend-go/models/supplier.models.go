package models

import "time"

type Supplier struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	SupplierName    string     `json:"supplier_name" gorm:"size:255"`
	SupplierAddress string     `json:"supplier_address" gorm:"size:255"`
	SupplierPhone   string     `json:"supplier_phone" gorm:"size:255"`
	TaxNumber       string     `json:"tax_number" gorm:"size:255"`
	StartingDate    *time.Time `json:"starting_date"`
	CompanyID       uint       `json:"company_id"`
	UserID          uint       `json:"user_id"`
	User            User       `json:"user" gorm:"foreignKey:UserID"`
}
