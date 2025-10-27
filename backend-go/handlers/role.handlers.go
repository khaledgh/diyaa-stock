package handlers

import (
	"net/http"
	"strconv"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type RoleServiceInterface interface {
	GetAllRoles(companyID uint) ([]models.Role, error)
	GetRoleByID(roleID, companyID uint) (*models.Role, error)
	CreateRole(role *models.Role) error
	UpdateRole(roleID, companyID uint, updates map[string]interface{}) error
	DeleteRole(roleID, companyID uint) error
	AssignPermissionsToRole(roleID uint, permissionIDs []uint) error
	GetAllPermissions() ([]models.Permission, error)
	AssignRoleToUser(userID, roleID uint) error
	RemoveRoleFromUser(userID, roleID uint) error
	GetUserRoles(userID uint) ([]models.Role, error)
	CheckUserPermission(userID uint, resource, action string) (bool, error)
	GetUsersWithRoles(companyID uint) ([]map[string]interface{}, error)
}

type RoleHandler struct {
	RoleService RoleServiceInterface
}

func NewRoleHandler(rs RoleServiceInterface) *RoleHandler {
	return &RoleHandler{
		RoleService: rs,
	}
}

// GetRoles retrieves all roles for the company
func (rh *RoleHandler) GetRoles(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	roles, err := rh.RoleService.GetAllRoles(user.CompanyID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, roles)
}

// GetRole retrieves a single role by ID
func (rh *RoleHandler) GetRole(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	roleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid role ID"})
	}

	role, err := rh.RoleService.GetRoleByID(uint(roleID), user.CompanyID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Role not found"})
	}

	return c.JSON(http.StatusOK, role)
}

// CreateRole creates a new role
func (rh *RoleHandler) CreateRole(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	var role models.Role
	if err := c.Bind(&role); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	role.CompanyID = user.CompanyID
	role.IsSystem = false

	if err := rh.RoleService.CreateRole(&role); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusCreated, role)
}

// UpdateRole updates an existing role
func (rh *RoleHandler) UpdateRole(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	roleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid role ID"})
	}

	var updates map[string]interface{}
	if err := c.Bind(&updates); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := rh.RoleService.UpdateRole(uint(roleID), user.CompanyID, updates); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Role updated successfully"})
}

// DeleteRole deletes a role
func (rh *RoleHandler) DeleteRole(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	roleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid role ID"})
	}

	if err := rh.RoleService.DeleteRole(uint(roleID), user.CompanyID); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Role deleted successfully"})
}

// GetPermissions retrieves all available permissions
func (rh *RoleHandler) GetPermissions(c echo.Context) error {
	permissions, err := rh.RoleService.GetAllPermissions()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, permissions)
}

// AssignPermissions assigns permissions to a role
func (rh *RoleHandler) AssignPermissions(c echo.Context) error {
	roleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid role ID"})
	}

	var request struct {
		PermissionIDs []uint `json:"permission_ids"`
	}

	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := rh.RoleService.AssignPermissionsToRole(uint(roleID), request.PermissionIDs); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Permissions assigned successfully"})
}

// AssignRoleToUser assigns a role to a user
func (rh *RoleHandler) AssignRoleToUser(c echo.Context) error {
	var request struct {
		UserID uint `json:"user_id" validate:"required"`
		RoleID uint `json:"role_id" validate:"required"`
	}

	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := rh.RoleService.AssignRoleToUser(request.UserID, request.RoleID); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Role assigned to user successfully"})
}

// RemoveRoleFromUser removes a role from a user
func (rh *RoleHandler) RemoveRoleFromUser(c echo.Context) error {
	var request struct {
		UserID uint `json:"user_id" validate:"required"`
		RoleID uint `json:"role_id" validate:"required"`
	}

	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if err := rh.RoleService.RemoveRoleFromUser(request.UserID, request.RoleID); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Role removed from user successfully"})
}

// GetUsersWithRoles retrieves all users with their roles
func (rh *RoleHandler) GetUsersWithRoles(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	users, err := rh.RoleService.GetUsersWithRoles(user.CompanyID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, users)
}

// CheckPermission checks if the current user has a specific permission
func (rh *RoleHandler) CheckPermission(c echo.Context) error {
	userInterface := c.Get("user")
	user := userInterface.(models.User)

	resource := c.QueryParam("resource")
	action := c.QueryParam("action")

	if resource == "" || action == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Resource and action are required"})
	}

	hasPermission, err := rh.RoleService.CheckUserPermission(user.ID, resource, action)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]bool{"has_permission": hasPermission})
}
