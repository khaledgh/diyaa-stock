import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Users, Check, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  permissions: Permission[];
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  status: string;
  roles: Role[];
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        axios.get('/api/roles'),
        axios.get('/api/permissions'),
        axios.get('/api/users-with-roles'),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
      setUsers(usersRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      await axios.post('/api/roles', roleForm);
      toast.success('Role created successfully');
      setShowRoleModal(false);
      setRoleForm({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    try {
      await axios.put(`/api/roles/${selectedRole.id}`, roleForm);
      toast.success('Role updated successfully');
      setShowRoleModal(false);
      setSelectedRole(null);
      setRoleForm({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await axios.delete(`/api/roles/${roleId}`);
      toast.success('Role deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleAssignPermissions = async () => {
    if (!selectedRole) return;
    try {
      await axios.post(`/api/roles/${selectedRole.id}/permissions`, {
        permission_ids: selectedPermissions,
      });
      toast.success('Permissions assigned successfully');
      setShowPermissionModal(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign permissions');
    }
  };

  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      await axios.post('/api/users/assign-role', {
        user_id: userId,
        role_id: roleId,
      });
      toast.success('Role assigned to user successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    try {
      await axios.post('/api/users/remove-role', {
        user_id: userId,
        role_id: roleId,
      });
      toast.success('Role removed from user successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove role');
    }
  };

  const openEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({ name: role.name, description: role.description });
    setShowRoleModal(true);
  };

  const openPermissionModal = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions.map(p => p.id));
    setShowPermissionModal(true);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-1">Manage user roles and access control</p>
        </div>
        <button
          onClick={() => {
            setSelectedRole(null);
            setRoleForm({ name: '', description: '' });
            setShowRoleModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Shield className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                  {role.is_system && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">System</span>
                  )}
                </div>
              </div>
              {!role.is_system && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditRole(role)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">{role.description}</p>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Permissions</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {role.permissions.length}
                </span>
              </div>
              <button
                onClick={() => openPermissionModal(role)}
                className="w-full text-sm text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition"
              >
                Manage Permissions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Users with Roles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-gray-700" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">User Role Assignments</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
                        >
                          {role.name}
                          {!role.is_system && (
                            <button
                              onClick={() => handleRemoveRole(user.id, role.id)}
                              className="hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserRoleModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Assign Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {selectedRole ? 'Edit Role' : 'Create New Role'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manager, Cashier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the role's responsibilities"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole(null);
                  setRoleForm({ name: '', description: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={selectedRole ? handleUpdateRole : handleCreateRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedRole ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Manage Permissions for {selectedRole.name}
            </h3>
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 capitalize">{resource}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {perms.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{permission.action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setSelectedRole(null);
                  setSelectedPermissions([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPermissions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Role Assignment Modal */}
      {showUserRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Assign Role to {selectedUser.full_name}
            </h3>
            <div className="space-y-2">
              {roles.map((role) => {
                const hasRole = selectedUser.roles.some(r => r.id === role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => {
                      if (!hasRole) {
                        handleAssignRole(selectedUser.id, role.id);
                        setShowUserRoleModal(false);
                        setSelectedUser(null);
                      }
                    }}
                    disabled={hasRole}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                      hasRole
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                        : 'hover:bg-blue-50 border-gray-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{role.name}</div>
                        <div className="text-sm text-gray-600">{role.description}</div>
                      </div>
                      {hasRole && <Check className="text-green-600" size={20} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setShowUserRoleModal(false);
                setSelectedUser(null);
              }}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
