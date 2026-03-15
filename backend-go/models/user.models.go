package models

import (
	"time"

	"github.com/golang-jwt/jwt"
)

type User struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	Email          string     `json:"email" gorm:"unique"`
	CompanyID      uint       `json:"company_id"`
	FirstName      string     `json:"first_name" gorm:"size:255"`
	LastName       string     `json:"last_name" gorm:"size:255"`
	FullName       string     `json:"full_name" gorm:"-"` // Computed field
	Phone          string     `json:"phone" gorm:"size:255"`
	Image          string     `json:"image"`
	Status         string     `json:"status" gorm:"default:ACTIVE"`
	IsActive       bool       `json:"is_active" gorm:"-"` // Computed from Status
	Password       string     `json:"-"`
	Role           string     `json:"role" gorm:"default:USER"`
	Position       *string    `json:"position" gorm:"size:100"`
	HireDate       *string    `json:"hire_date" gorm:"size:20"`
	Salary         float64    `json:"salary" gorm:"type:decimal(15,2);default:0"`
	Address        *string    `json:"address" gorm:"type:text"`
	LocationID     *uint      `json:"location_id"`
	Location       *Location  `json:"location,omitempty" gorm:"foreignKey:LocationID"`
	LocationName   string     `json:"location_name" gorm:"-"` // Computed field
	Locations      []Location `json:"locations" gorm:"-"`     // Multi-location assignments (loaded via user_locations)
	LocationIDs    []uint     `json:"location_ids" gorm:"-"`  // Convenience field for API responses
	CommissionRate float64    `json:"commission_rate" gorm:"type:decimal(5,2);default:0"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

type Claims struct {
	Email string `json:"email"`
	jwt.StandardClaims
}
