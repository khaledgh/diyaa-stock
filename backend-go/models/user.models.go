package models

import (
	"time"

	"github.com/golang-jwt/jwt"
)

type User struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Email      string    `json:"email" gorm:"unique"`
	CompanyID  uint      `json:"company_id"`
	FirstName  string    `json:"first_name" gorm:"size:255"`
	LastName   string    `json:"last_name" gorm:"size:255"`
	FullName   string    `json:"full_name" gorm:"-"` // Computed field
	Phone      string    `json:"phone" gorm:"size:255"`
	Image      string    `json:"image"`
	Status     string    `json:"status" gorm:"default:ACTIVE"`
	IsActive   bool      `json:"is_active" gorm:"-"` // Computed from Status
	Password   string    `json:"-"`
	Role       string    `json:"role" gorm:"default:USER"`
	Position   *string   `json:"position" gorm:"size:100"`
	VanID      *uint     `json:"van_id"`
	Van        *Van      `json:"van,omitempty" gorm:"foreignKey:VanID"`
	VanName    string    `json:"van_name" gorm:"-"` // Computed field
	LocationID *uint     `json:"location_id"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type Claims struct {
	Email string `json:"email"`
	jwt.StandardClaims
}
