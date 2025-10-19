package models

import "time"

type Employee struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	FullName    string     `json:"full_name" gorm:"size:100;not null"`
	Phone       *string    `json:"phone" gorm:"size:20"`
	Email       *string    `json:"email" gorm:"size:100"`
	Position    *string    `json:"position" gorm:"size:50"`
	HireDate    *time.Time `json:"hire_date"`
	Salary      float64    `json:"salary" gorm:"default:0"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
