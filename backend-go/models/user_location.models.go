package models

import "time"

// UserLocation is a junction table for many-to-many between User and Location
type UserLocation struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"user_id" gorm:"not null;index"`
	LocationID uint      `json:"location_id" gorm:"not null;index"`
	User       User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Location   Location  `json:"location,omitempty" gorm:"foreignKey:LocationID"`
	CreatedAt  time.Time `json:"created_at"`
}

// DailyLocationSession tracks which location a sales rep is working at today
type DailyLocationSession struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"user_id" gorm:"not null;index"`
	LocationID uint      `json:"location_id" gorm:"not null"`
	Date       string    `json:"date" gorm:"size:10;not null;index"` // YYYY-MM-DD
	Status     string    `json:"status" gorm:"size:20;default:active"` // active, closed
	User       User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Location   Location  `json:"location,omitempty" gorm:"foreignKey:LocationID"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// SystemSetting stores app-wide configuration like location_mode
type SystemSetting struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"size:100;uniqueIndex;not null"`
	Value     string    `json:"value" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
