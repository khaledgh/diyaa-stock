package handlers

import "strconv"

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
