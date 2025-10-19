package models

import "time"

type Location struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Name        string     `json:"name" gorm:"size:100;not null"`
	Type        string     `json:"type" gorm:"size:20;default:warehouse"` // warehouse, store, van, etc
	Address     *string    `json:"address" gorm:"type:text"`
	Phone       *string    `json:"phone" gorm:"size:20"`
	ManagerName *string    `json:"manager_name" gorm:"size:100"`
	VanID       *uint      `json:"van_id"` // For van-type locations
	Van         *Van       `json:"van,omitempty" gorm:"foreignKey:VanID"`
	VanName     string     `json:"van_name" gorm:"-"` // Computed field
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
