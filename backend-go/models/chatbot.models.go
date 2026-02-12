package models

import (
	"time"
)

type ChatSession struct {
	ID        uint          `json:"id" gorm:"primaryKey"`
	Title     string        `json:"title" gorm:"size:200"`
	Messages  []ChatMessage `json:"messages" gorm:"foreignKey:SessionID"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type ChatMessage struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	SessionID uint      `json:"session_id" gorm:"index"`
	Role      string    `json:"role" gorm:"size:10"` // user, ai
	Content   string    `json:"content" gorm:"type:text"`
	Image     string    `json:"image" gorm:"type:longtext"` // base64 image data
	Data      string    `json:"data" gorm:"type:text"`      // JSON string of extracted data
	Timestamp time.Time `json:"timestamp"`
}
