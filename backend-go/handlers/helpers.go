package handlers

import (
	"errors"
	"strconv"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

// convertToUintPtr converts various types to *uint
// Handles: string, float64, int, uint, or nil
func convertToUintPtr(value any) *uint {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case string:
		if v == "" || v == "0" {
			return nil
		}
		if num, err := strconv.ParseUint(v, 10, 32); err == nil {
			result := uint(num)
			return &result
		}
	case float64:
		if v == 0 {
			return nil
		}
		result := uint(v)
		return &result
	case int:
		if v == 0 {
			return nil
		}
		result := uint(v)
		return &result
	case uint:
		if v == 0 {
			return nil
		}
		return &v
	}
	return nil
}

// ParseUint converts a string to uint
func ParseUint(s string) (uint, error) {
	val, err := strconv.ParseUint(s, 10, 32)
	if err != nil {
		return 0, errors.New("invalid ID format")
	}
	return uint(val), nil
}

// ParseDate parses a date string in various formats
func ParseDate(dateStr string) (time.Time, error) {
	// Try different date formats
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
		time.RFC3339,
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, errors.New("invalid date format")
}

// GetUserIDFromContext extracts user ID from the context
func GetUserIDFromContext(c echo.Context) uint {
	// Try to get user from context (adjust based on your auth implementation)
	user := c.Get("user")
	if user != nil {
		if userModel, ok := user.(*models.User); ok {
			return userModel.ID
		}
		// If it's stored as a map or different structure
		if userMap, ok := user.(map[string]interface{}); ok {
			if id, ok := userMap["id"].(float64); ok {
				return uint(id)
			}
		}
	}
	return 0
}
