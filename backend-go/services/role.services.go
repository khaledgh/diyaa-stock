package services

import (
	"errors"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"gorm.io/gorm"
)

type RoleService struct {
	Role models.Role
	DB   *gorm.DB
}

func NewRoleService(r models.Role, db *gorm.DB) *RoleService {
	return &RoleService{
		Role: r,
		DB:   db,
	}
}

// GetAllRoles retrieves all roles for a company
func (rs *RoleService) GetAllRoles(companyID uint) ([]models.Role, error) {
	var roles []models.Role
	if err := rs.DB.Where("company_id = ?", companyID).
		Preload("Permissions").
		Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// GetRoleByID retrieves a single role by ID
func (rs *RoleService) GetRoleByID(roleID, companyID uint) (*models.Role, error) {
	var role models.Role
	if err := rs.DB.Where("id = ? AND company_id = ?", roleID, companyID).
		Preload("Permissions").
		First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// CreateRole creates a new role
func (rs *RoleService) CreateRole(role *models.Role) error {
	return rs.DB.Create(role).Error
}

// UpdateRole updates an existing role
func (rs *RoleService) UpdateRole(roleID, companyID uint, updates map[string]interface{}) error {
	var role models.Role
	if err := rs.DB.Where("id = ? AND company_id = ?", roleID, companyID).
		First(&role).Error; err != nil {
		return err
	}

	if role.IsSystem {
		return errors.New("cannot update system roles")
	}

	return rs.DB.Model(&role).Updates(updates).Error
}

// DeleteRole deletes a role
func (rs *RoleService) DeleteRole(roleID, companyID uint) error {
	var role models.Role
	if err := rs.DB.Where("id = ? AND company_id = ?", roleID, companyID).
		First(&role).Error; err != nil {
		return err
	}

	if role.IsSystem {
		return errors.New("cannot delete system roles")
	}

	// Check if any users have this role
	var count int64
	rs.DB.Model(&models.UserRole{}).Where("role_id = ?", roleID).Count(&count)
	if count > 0 {
		return errors.New("cannot delete role that is assigned to users")
	}

	return rs.DB.Delete(&role).Error
}

// AssignPermissionsToRole assigns permissions to a role
func (rs *RoleService) AssignPermissionsToRole(roleID uint, permissionIDs []uint) error {
	var role models.Role
	if err := rs.DB.First(&role, roleID).Error; err != nil {
		return err
	}

	// Clear existing permissions
	rs.DB.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID)

	// Assign new permissions
	for _, permID := range permissionIDs {
		rs.DB.Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", roleID, permID)
	}

	return nil
}

// GetAllPermissions retrieves all available permissions
func (rs *RoleService) GetAllPermissions() ([]models.Permission, error) {
	var permissions []models.Permission
	if err := rs.DB.Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// AssignRoleToUser assigns a role to a user
func (rs *RoleService) AssignRoleToUser(userID, roleID uint) error {
	// Check if assignment already exists
	var existing models.UserRole
	if err := rs.DB.Where("user_id = ? AND role_id = ?", userID, roleID).
		First(&existing).Error; err == nil {
		return errors.New("user already has this role")
	}

	userRole := models.UserRole{
		UserID: userID,
		RoleID: roleID,
	}
	return rs.DB.Create(&userRole).Error
}

// RemoveRoleFromUser removes a role from a user
func (rs *RoleService) RemoveRoleFromUser(userID, roleID uint) error {
	return rs.DB.Where("user_id = ? AND role_id = ?", userID, roleID).
		Delete(&models.UserRole{}).Error
}

// GetUserRoles retrieves all roles for a user
func (rs *RoleService) GetUserRoles(userID uint) ([]models.Role, error) {
	var roles []models.Role
	if err := rs.DB.
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Preload("Permissions").
		Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// CheckUserPermission checks if a user has a specific permission
func (rs *RoleService) CheckUserPermission(userID uint, resource, action string) (bool, error) {
	var count int64
	err := rs.DB.Table("permissions").
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Joins("JOIN user_roles ON user_roles.role_id = role_permissions.role_id").
		Where("user_roles.user_id = ? AND permissions.resource = ? AND permissions.action = ?",
			userID, resource, action).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// GetUsersWithRoles retrieves all users with their assigned roles
func (rs *RoleService) GetUsersWithRoles(companyID uint) ([]map[string]interface{}, error) {
	var users []models.User
	if err := rs.DB.Where("company_id = ?", companyID).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0)
	for _, user := range users {
		roles, _ := rs.GetUserRoles(user.ID)
		result = append(result, map[string]interface{}{
			"id":         user.ID,
			"email":      user.Email,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"full_name":  user.FirstName + " " + user.LastName,
			"status":     user.Status,
			"roles":      roles,
		})
	}

	return result, nil
}
