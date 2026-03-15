package handlers

import (
	"net/http"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type SessionHandler struct {
	DB *gorm.DB
}

func NewSessionHandler(db *gorm.DB) *SessionHandler {
	return &SessionHandler{DB: db}
}

// GetTodaySession returns the active session for the current user today
func (h *SessionHandler) GetTodaySession(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	today := time.Now().Format("2006-01-02")
	var session models.DailyLocationSession
	result := h.DB.Where("user_id = ? AND date = ? AND status = ?", user.ID, today, "active").
		Preload("Location").First(&session)

	if result.Error != nil {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"ok":      true,
			"session": nil,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"ok":      true,
		"session": session,
	})
}

// CreateTodaySession creates/updates a session for today (used in auto mode by sales rep)
func (h *SessionHandler) CreateTodaySession(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	var req struct {
		LocationID uint `json:"location_id"`
	}
	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// Verify user is assigned to this location
	var count int64
	h.DB.Model(&models.UserLocation{}).Where("user_id = ? AND location_id = ?", user.ID, req.LocationID).Count(&count)
	if count == 0 {
		// Also allow if user's primary location_id matches
		if user.LocationID == nil || *user.LocationID != req.LocationID {
			return c.JSON(http.StatusForbidden, map[string]interface{}{
				"ok":      false,
				"message": "You are not assigned to this location",
			})
		}
	}

	today := time.Now().Format("2006-01-02")

	// Close any existing session for today
	h.DB.Model(&models.DailyLocationSession{}).
		Where("user_id = ? AND date = ? AND status = ?", user.ID, today, "active").
		Update("status", "closed")

	// Create new session
	session := models.DailyLocationSession{
		UserID:     user.ID,
		LocationID: req.LocationID,
		Date:       today,
		Status:     "active",
	}
	if err := h.DB.Create(&session).Error; err != nil {
		return ResponseError(c, err)
	}

	// Reload with relations
	h.DB.Preload("Location").First(&session, session.ID)

	return ResponseSuccess(c, "Session started", session)
}

// AdminSetSession allows admin to set a session for a user (manual mode)
func (h *SessionHandler) AdminSetSession(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	var req struct {
		UserID     uint   `json:"user_id"`
		LocationID uint   `json:"location_id"`
		Date       string `json:"date"` // YYYY-MM-DD, defaults to today
	}
	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	// Close any existing session for this user on this date
	h.DB.Model(&models.DailyLocationSession{}).
		Where("user_id = ? AND date = ? AND status = ?", req.UserID, req.Date, "active").
		Update("status", "closed")

	session := models.DailyLocationSession{
		UserID:     req.UserID,
		LocationID: req.LocationID,
		Date:       req.Date,
		Status:     "active",
	}
	if err := h.DB.Create(&session).Error; err != nil {
		return ResponseError(c, err)
	}

	h.DB.Preload("Location").Preload("User").First(&session, session.ID)

	return ResponseSuccess(c, "Session set", session)
}

// GetAllSessions returns all sessions optionally filtered by date
func (h *SessionHandler) GetAllSessions(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	date := c.QueryParam("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	var sessions []models.DailyLocationSession
	h.DB.Where("date = ?", date).Preload("Location").Preload("User").Find(&sessions)

	// Populate computed fields
	for i := range sessions {
		sessions[i].User.FullName = sessions[i].User.FirstName + " " + sessions[i].User.LastName
	}

	return ResponseOK(c, sessions, "data")
}

// GetLocationMode returns the current location mode setting
func (h *SessionHandler) GetLocationMode(c echo.Context) error {
	var setting models.SystemSetting
	result := h.DB.Where("`key` = ?", "location_mode").First(&setting)
	mode := "automatic" // default
	if result.Error == nil {
		mode = setting.Value
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"ok":   true,
		"mode": mode,
	})
}

// SetLocationMode sets the location mode (manual or automatic)
func (h *SessionHandler) SetLocationMode(c echo.Context) error {
	_, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}

	var req struct {
		Mode string `json:"mode"` // "manual" or "automatic"
	}
	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	if req.Mode != "manual" && req.Mode != "automatic" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"ok":      false,
			"message": "Mode must be 'manual' or 'automatic'",
		})
	}

	var setting models.SystemSetting
	result := h.DB.Where("`key` = ?", "location_mode").First(&setting)
	if result.Error != nil {
		setting = models.SystemSetting{Key: "location_mode", Value: req.Mode}
		h.DB.Create(&setting)
	} else {
		setting.Value = req.Mode
		h.DB.Save(&setting)
	}

	return ResponseSuccess(c, "Location mode updated", map[string]string{"mode": req.Mode})
}

// GetUserLocations returns the locations assigned to a specific user
func (h *SessionHandler) GetUserLocations(c echo.Context) error {
	userID := c.Param("user_id")

	var userLocations []models.UserLocation
	h.DB.Where("user_id = ?", userID).Preload("Location").Find(&userLocations)

	locations := make([]models.Location, 0, len(userLocations))
	for _, ul := range userLocations {
		locations = append(locations, ul.Location)
	}

	return ResponseOK(c, locations, "data")
}
