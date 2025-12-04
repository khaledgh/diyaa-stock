package models

import "time"

type Transfer struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	FromLocationType string         `json:"from_location_type" gorm:"size:20;not null"`
	FromLocationID   uint           `json:"from_location_id" gorm:"not null"`
	ToLocationType   string         `json:"to_location_type" gorm:"size:20;not null"`
	ToLocationID     uint           `json:"to_location_id" gorm:"not null"`
	Status           string         `json:"status" gorm:"size:20;default:pending"` // pending, completed, cancelled
	Notes            *string        `json:"notes" gorm:"type:text"`
	CreatedBy        uint           `json:"created_by"`
	CreatedByUser    *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedBy"`
	Items            []TransferItem `json:"items,omitempty" gorm:"foreignKey:TransferID"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type TransferItem struct {
	ID         uint     `json:"id" gorm:"primaryKey"`
	TransferID uint     `json:"transfer_id" gorm:"not null"`
	ProductID  uint     `json:"product_id" gorm:"not null"`
	Product    *Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity   float64  `json:"quantity" gorm:"not null"`
}
