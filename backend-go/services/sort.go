package services

import (
	"strings"

	"gorm.io/gorm"
)

func sortDirection(direction string) string {
	if strings.EqualFold(direction, "desc") {
		return "DESC"
	}
	return "ASC"
}

// SafeOrder builds an ORDER BY clause from user input. Sort keys must appear in
// allowed (key -> SQL expression), so request values never reach SQL directly.
func SafeOrder(sortBy, direction string, allowed map[string]string, fallback string) string {
	expr, ok := allowed[sortBy]
	if !ok {
		return fallback
	}
	return expr + " " + sortDirection(direction)
}

// SafeColumnOrder orders by sortBy only if it is a real column of the query's
// model; anything else (including injection attempts) falls back to id.
func SafeColumnOrder(query *gorm.DB, sortBy, direction string) string {
	stmt := &gorm.Statement{DB: query}
	if query.Statement.Model != nil && stmt.Parse(query.Statement.Model) == nil {
		if field := stmt.Schema.LookUpField(sortBy); field != nil && field.DBName != "" {
			return stmt.Schema.Table + "." + field.DBName + " " + sortDirection(direction)
		}
		return stmt.Schema.Table + ".id " + sortDirection(direction)
	}
	return "id " + sortDirection(direction)
}
