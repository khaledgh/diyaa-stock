package services

// PaginationResponse represents a paginated response
type PaginationResponse struct {
	Data        interface{} `json:"data"`
	Total       int         `json:"total"`
	CurrentPage int         `json:"current_page"`
	PerPage     int         `json:"per_page"`
	TotalPages  int         `json:"total_pages"`
}
