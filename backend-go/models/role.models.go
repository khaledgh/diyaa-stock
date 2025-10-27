package models

import "time"

type Role struct {
	ID          uint         `json:"id" gorm:"primaryKey"`
	Name        string       `json:"name" gorm:"unique;not null"`
	Description string       `json:"description"`
	CompanyID   uint         `json:"company_id"`
	IsSystem    bool         `json:"is_system" gorm:"default:false"` // System roles can't be deleted
	CreatedAt   time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
	Permissions []Permission `json:"permissions" gorm:"many2many:role_permissions;"`
}

type Permission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Resource    string    `json:"resource" gorm:"not null"` // e.g., "products", "invoices", "users"
	Action      string    `json:"action" gorm:"not null"`   // e.g., "view", "create", "update", "delete"
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type RolePermission struct {
	RoleID       uint `json:"role_id" gorm:"primaryKey"`
	PermissionID uint `json:"permission_id" gorm:"primaryKey"`
}

type UserRole struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	RoleID    uint      `json:"role_id" gorm:"not null"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Role      *Role     `json:"role,omitempty" gorm:"foreignKey:RoleID"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// PermissionCheck represents a permission check request
type PermissionCheck struct {
	UserID   uint   `json:"user_id"`
	Resource string `json:"resource"`
	Action   string `json:"action"`
}
