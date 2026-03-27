/**
 * 角色管理Tab Mixin
 *
 * 功能：
 * - 角色列表展示
 * - 创建角色（超级管理员）
 * - 编辑角色权限
 * - 删除角色
 */

import { StoreService } from '../../../services/store.js';

export const rolesTabMixin = {
  data() {
    return {
      roles: [],
      showRoleModal: false,
      showPermissionModal: false,
      editingRole: null,
      roleForm: {
        roleCode: '',
        roleName: '',
        description: ''
      },
      permissionForm: {
        menus: [],
        operations: [],
        dataScope: 'self'
      },
      // 权限选项
      menuOptions: [
        { label: '业绩汇总', value: 'overview' },
        { label: '用户管理', value: 'users' },
        { label: '支行管理', value: 'branches' },
        { label: '业务规则', value: 'rules' },
        { label: '系统设置', value: 'settings' },
        { label: '角色管理', value: 'roles' },
        { label: '知识库管理', value: 'knowledge' },
        { label: '问卷管理', value: 'questionnaire' },
        { label: '拓展业务', value: 'credit' }
      ],
      operationOptions: [
        { label: '查看', value: 'view' },
        { label: '新增', value: 'create' },
        { label: '编辑', value: 'update' },
        { label: '删除', value: 'delete' },
        { label: '导出', value: 'export' },
        { label: '导入', value: 'import' },
        { label: '审核', value: 'verify' },
        { label: '分配角色', value: 'assign_role' }
      ],
      dataScopeOptions: [
        { label: '仅本人', value: 'self' },
        { label: '本支行', value: 'branch' },
        { label: '全部数据', value: 'all' }
      ]
    };
  },

  computed: {
    isSuperAdmin() {
      return this.currentUser && this.currentUser.roles &&
        this.currentUser.roles.includes('super_admin');
    }
  },

  methods: {
    async refreshRoles() {
      try {
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: { action: 'getRoles' }
        });
        this.roles = res.result.data || [];
      } catch (error) {
        console.error('Failed to refresh roles:', error);
        uni.showToast({ title: '加载角色失败', icon: 'none' });
      }
    },

    openRoleModal(role) {
      this.editingRole = role;
      if (role) {
        this.roleForm = {
          roleCode: role.roleCode,
          roleName: role.roleName,
          description: role.description
        };
      } else {
        this.roleForm = {
          roleCode: '',
          roleName: '',
          description: ''
        };
      }
      this.showRoleModal = true;
    },

    closeRoleModal() {
      this.showRoleModal = false;
      this.editingRole = null;
    },

    async saveRole() {
      if (!this.roleForm.roleCode || !this.roleForm.roleName) {
        uni.showToast({ title: '请完整填写角色信息', icon: 'none' });
        return;
      }

      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'createRole',
            payload: {
              ...this.roleForm,
              permissions: {
                menus: [],
                operations: [],
                dataScope: 'self'
              }
            }
          }
        });
        uni.showToast({ title: '角色已创建', icon: 'success' });
        this.closeRoleModal();
        await this.refreshRoles();
      } catch (error) {
        uni.showToast({ title: error.message || '创建失败', icon: 'none' });
      }
    },

    openPermissionModal(role) {
      this.editingRole = role;
      this.permissionForm = {
        menus: role.permissions?.menus || [],
        operations: role.permissions?.operations || [],
        dataScope: role.permissions?.dataScope || 'self'
      };
      this.showPermissionModal = true;
    },

    closePermissionModal() {
      this.showPermissionModal = false;
      this.editingRole = null;
    },

    async savePermissions() {
      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'updateRolePermissions',
            payload: {
              roleCode: this.editingRole.roleCode,
              permissions: this.permissionForm
            }
          }
        });
        uni.showToast({ title: '权限已更新', icon: 'success' });
        this.closePermissionModal();
        await this.refreshRoles();
      } catch (error) {
        uni.showToast({ title: error.message || '更新失败', icon: 'none' });
      }
    },

    async deleteRole(role) {
      if (role.roleCode.startsWith('default_')) {
        uni.showToast({ title: '系统默认角色不能删除', icon: 'none' });
        return;
      }

      uni.showModal({
        title: '确认删除',
        content: `确认删除角色【${role.roleName}】？`,
        cancelText: '取消',
        confirmText: '删除',
        confirmColor: '#e11d48',
        success: async res => {
          if (!res.confirm) return;
          try {
            await uniCloud.callFunction({
              name: 'appService',
              data: {
                action: 'deleteRole',
                payload: { roleCode: role.roleCode }
              }
            });
            uni.showToast({ title: '角色已删除', icon: 'success' });
            await this.refreshRoles();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },

    getPermissionLabels(role, type) {
      const permissions = role.permissions?.[type] || [];
      if (permissions.includes('all')) {
        return '全部';
      }
      const options = type === 'menus' ? this.menuOptions : this.operationOptions;
      return permissions.map(p => {
        const opt = options.find(o => o.value === p);
        return opt ? opt.label : p;
      }).join('、');
    }
  }
};
