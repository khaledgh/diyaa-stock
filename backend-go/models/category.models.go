package models

import "time"

type Category struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	NameEn      string     `json:"name_en" gorm:"size:100;not null"`
	NameAr      *string    `json:"name_ar" gorm:"size:100"`
	Description *string    `json:"description" gorm:"type:text"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
