package models

import "time"

type Van struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Name        string     `json:"name" gorm:"size:100;not null"`
	PlateNumber *string    `json:"plate_number" gorm:"size:50"`
	OwnerType   string     `json:"owner_type" gorm:"size:20;not null"` // company, rental
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
