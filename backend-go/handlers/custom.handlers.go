package handlers

import (
	"errors"
	"fmt"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type PaginationResponse struct {
	OK   bool        `json:"ok"`
	Data interface{} `json:"data"`
	Meta Meta        `json:"meta"`
}

type Meta struct {
	CurrentPage int `json:"current_page"`
	Limit       int `json:"limit"`
	LastPage    int `json:"last_page"`
	TotalCount  int `json:"total_count"`
}

type Response struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data"`
	Error string      `json:"error"`
}

func ResponseError(c echo.Context, err error) error {
	response := map[string]interface{}{
		"ok":      false,
		"message": err.Error(),
	}
	return c.JSON(400, response)
}

func ResponseOK(c echo.Context, data interface{}, dataName string) error {
	response := map[string]interface{}{
		"ok":     true,
		dataName: data,
	}
	return c.JSON(200, response)
}

func ResponseSuccess(c echo.Context, method string, data interface{}) error {
	var response map[string]interface{}
	if data == nil {
		response = map[string]interface{}{
			"ok":      true,
			"message": fmt.Sprintf("Record %s successfully", method),
		}
	} else {
		response = map[string]interface{}{
			"data":    data,
			"ok":      true,
			"message": fmt.Sprintf("Record %s successfully", method),
		}
	}
	return c.JSON(200, response)
}

func GetUserContext(c echo.Context) (models.User, error) {
	user, ok := c.Get("user").(models.User)
	if !ok {
		// Handle the case where the user is not of the expected type
		return models.User{}, errors.New("failed to get user")
	}
	return user, nil
}
