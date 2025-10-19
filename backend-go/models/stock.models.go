package models

import "time"

type Stock struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	ProductID      uint      `json:"product_id" gorm:"not null"`
	Product        *Product  `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	LocationType   string    `json:"location_type" gorm:"size:20;not null"` // warehouse, van, location
	LocationID     uint      `json:"location_id" gorm:"not null"`
	Quantity       int       `json:"quantity" gorm:"default:0"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type StockMovement struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	ProductID        uint      `json:"product_id" gorm:"not null"`
	Product          *Product  `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	FromLocationType string    `json:"from_location_type" gorm:"size:20"`
	FromLocationID   uint      `json:"from_location_id"`
	ToLocationType   string    `json:"to_location_type" gorm:"size:20"`
	ToLocationID     uint      `json:"to_location_id"`
	Quantity         int       `json:"quantity" gorm:"not null"`
	MovementType     string    `json:"movement_type" gorm:"size:20;not null"` // transfer, sale, purchase, adjustment
	ReferenceID      *uint     `json:"reference_id"`
	Notes            *string   `json:"notes" gorm:"type:text"`
	CreatedBy        *uint     `json:"created_by"`
	CreatedByUser    *User     `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	CreatedAt        time.Time `json:"created_at"`
}
