package models

import "time"

type Product struct {
	ID            uint         `json:"id" gorm:"primaryKey"`
	SKU           string       `json:"sku" gorm:"size:50;unique;not null"`
	Barcode       *string      `json:"barcode" gorm:"size:50"`
	NameEn        string       `json:"name_en" gorm:"size:100;not null"`
	NameAr        *string      `json:"name_ar" gorm:"size:100"`
	Description   *string      `json:"description" gorm:"type:text"`
	CategoryID    *uint        `json:"category_id"`
	Category      *Category    `json:"category" gorm:"foreignKey:CategoryID"`
	TypeID        *uint        `json:"type_id"`
	ProductType   *ProductType `json:"product_type" gorm:"foreignKey:TypeID"`
	UnitPrice     float64      `json:"unit_price" gorm:"not null"`
	CostPrice     float64      `json:"cost_price" gorm:"not null"`
	Unit          string       `json:"unit" gorm:"size:20;default:piece"`
	MinStockLevel int          `json:"min_stock_level" gorm:"default:0"`
	IsActive      bool         `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	DeletedAt     *time.Time   `json:"deleted_at,omitempty" gorm:"index"`
}

type ProductBrand struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	NameEn    string     `json:"name_en" gorm:"size:100;not null"`
	NameAr    *string    `json:"name_ar" gorm:"size:100"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

type ProductType struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	NameEn    string     `json:"name_en" gorm:"size:100;not null"`
	NameAr    *string    `json:"name_ar" gorm:"size:100"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
