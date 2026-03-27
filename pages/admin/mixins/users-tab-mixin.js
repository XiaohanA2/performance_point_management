import { StoreService } from '../../../services/store.js';
import {
  getManageableRoles,
  canPerformUserOperation,
  filterManageableUsers,
  ROLE_NAMES
} from '../../../services/permission-service.js';

export const usersTabMixin = {
  data() {
    return {
      users: [],
      showUserModal: false,
      editingUser: null,
      userForm: {
        name: '',
        phone: '',
        branch: '',
        roles: ['manager']
      },
      userSearch: '',
      branchIndex: 0,
      // 新增：角色筛选和批量操作
      roleFilter: '',
      roleFilterExpanded: false,
      selectedUsers: [],
      showBatchRoleModal: false,
      batchRoleForm: {
        role: 'manager'
      },
      // 新增：角色列表
      allRoles: []
    };
  },

  computed: {
    branchNameOptions() {
      return this.branches.map(b => b.name);
    },

    branchIdOptions() {
      return this.branches.map(b => b.id);
    },

    // 根据当前用户权限动态生成角色选项
    roleOptions() {
      const allRoles = StoreService.getRoles();
      const manageableRoles = getManageableRoles(this.currentUser, allRoles);
      return manageableRoles.map(roleCode => {
        const found = allRoles.find(r => r.roleCode === roleCode);
        return found ? found.roleName : (ROLE_NAMES[roleCode] || roleCode);
      });
    },

    roleCodeOptions() {
      return getManageableRoles(this.currentUser, StoreService.getRoles());
    },

    // 角色筛选选项
    roleFilterOptions() {
      const allRoles = StoreService.getRoles();
      const manageableRoles = getManageableRoles(this.currentUser, allRoles);
      const options = [{ label: '全部', value: '' }];
      manageableRoles.forEach(roleCode => {
        const found = allRoles.find(r => r.roleCode === roleCode);
        options.push({
          label: found ? found.roleName : (ROLE_NAMES[roleCode] || roleCode),
          value: roleCode
        });
      });
      return options;
    },

    filteredUsers() {
      // 先根据权限过滤用户
      let filtered = filterManageableUsers(this.currentUser, this.users);

      // 关键词搜索
      const keyword = this.userSearch.trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter(
          user =>
            user.name.toLowerCase().includes(keyword) ||
            user.phone.includes(keyword) ||
            (user.branchName || user.branch).toLowerCase().includes(keyword)
        );
      }

      // 角色筛选
      if (this.roleFilter) {
        filtered = filtered.filter(user => user.role === this.roleFilter);
      }

      return filtered;
    },

    // 批量选择状态
    allSelected() {
      return this.filteredUsers.length > 0 &&
        this.filteredUsers.every(u => this.selectedUsers.includes(u._id));
    },

    // 权限检查
    canCreateUser() {
      return canPerformUserOperation(this.currentUser, 'create');
    },

    canEditUser() {
      return user => canPerformUserOperation(this.currentUser, 'update', user);
    },

    canDeleteUser() {
      return user => canPerformUserOperation(this.currentUser, 'delete', user);
    }
  },

  methods: {
    // 获取角色显示名称
    getRoleDisplay(roleCode) {
      return ROLE_NAMES[roleCode] || roleCode;
    },

    // 根据角色代码获取角色名称
    getRoleNameByCode(roleCode) {
      return ROLE_NAMES[roleCode] || roleCode;
    },

    // 根据角色代码获取索引
    getRoleIndexByCode(roleCode) {
      const codes = this.roleCodeOptions;
      return Math.max(codes.indexOf(roleCode), 0);
    },

    openUserModal(user) {
      // 检查权限
      if (user && !canPerformUserOperation(this.currentUser, 'update', user)) {
        uni.showToast({ title: '无权限编辑此用户', icon: 'none' });
        return;
      }

      if (!user && !canPerformUserOperation(this.currentUser, 'create')) {
        uni.showToast({ title: '无权限创建用户', icon: 'none' });
        return;
      }

      this.editingUser = user || null;
      if (user) {
        this.userForm = { ...user };
      } else {
        const manageableRoles = getManageableRoles(this.currentUser);
        this.userForm = {
          name: '',
          phone: '',
          branchId: this.branchIdOptions[0] || '',
          branch: this.branchNameOptions[0] || '',
          role: manageableRoles[0] || 'manager'
        };
      }

      const idx = Math.max(
        this.branchIdOptions.findIndex(id => id === this.userForm.branchId),
        0
      );
      this.branchIndex = idx;
      this.userForm.branchId = this.branchIdOptions[idx] || '';
      this.userForm.branch = this.branchNameOptions[idx] || '';
      this.showUserModal = true;
    },

    closeUserModal() {
      this.showUserModal = false;
    },

    handleBranchPicker(event) {
      this.branchIndex = Number(event.detail.value);
      this.userForm.branchId = this.branchIdOptions[this.branchIndex] || '';
      this.userForm.branch = this.branchNameOptions[this.branchIndex] || '';
    },

    handleRolePicker(event) {
      const roleIndex = Number(event.detail.value);
      const roleCode = this.roleCodeOptions[roleIndex];
      this.userForm.role = roleCode;
    },

    async submitUserForm() {
      if (!this.userForm.name || !this.userForm.phone) {
        uni.showToast({ title: '请完整填写信息', icon: 'none' });
        return;
      }

      try {
        if (this.editingUser) {
          await StoreService.updateUser(this.editingUser.id, this.userForm);
          uni.showToast({ title: '已更新', icon: 'success' });
        } else {
          await StoreService.addUser(this.userForm);
          uni.showToast({ title: '已新增', icon: 'success' });
        }

        this.closeUserModal();
        await this.refreshUsers();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },

    async toggleUserStatus(user) {
      try {
        await StoreService.toggleUserStatus(user.id);
        await this.refreshUsers();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },

    handleResetPassword(user) {
      if (!user) return;
      uni.showModal({
        title: '确认重置',
        content: `确认将【${user.name}】的密码重置为123456？`,
        cancelText: '再想想',
        confirmText: '确认重置',
        confirmColor: '#0f766e',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.resetPassword(user.id);
            uni.showToast({
              title: '密码已重置',
              icon: 'success'
            });
          } catch (error) {
            uni.showToast({ title: error.message || '重置失败', icon: 'none' });
          }
        }
      });
    },

    // ========== 角色管理相关方法 ==========

    // 刷新时同时加载角色列表
    async refreshUsers() {
      try {
        this.users = await StoreService.getUsers();
        // 加载角色列表
        await this.loadRoles();
      } catch (error) {
        console.error('Failed to refresh users:', error);
      }
    },

    // 加载角色列表
    async loadRoles() {
      try {
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: { action: 'getRoles' }
        });
        this.allRoles = res.result.data || [];
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    },

    // 打开角色编辑弹窗
    openRoleModal(user) {
      this.editingUser = user;
      this.userForm = {
        ...user,
        roles: user.roles || ['manager']
      };
      this.showUserModal = true;
    },

    // 分配用户角色
    async assignUserRoles(user, roles) {
      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'assignUserRoles',
            payload: { userId: user._id, roles }
          }
        });
        uni.showToast({ title: '角色已更新', icon: 'success' });
        await this.refreshUsers();
      } catch (error) {
        uni.showToast({ title: error.message || '分配失败', icon: 'none' });
      }
    },

    // 全选/取消全选
    toggleSelectAll() {
      if (this.allSelected) {
        this.selectedUsers = [];
      } else {
        this.selectedUsers = this.filteredUsers.map(u => u._id);
      }
    },

    // 打开批量角色分配弹窗
    openBatchRoleModal() {
      if (this.selectedUsers.length === 0) {
        uni.showToast({ title: '请先选择用户', icon: 'none' });
        return;
      }
      this.showBatchRoleModal = true;
    },

    // 批量分配角色
    async batchAssignRoles() {
      try {
        await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'batchAssignRoles',
            payload: {
              userIds: this.selectedUsers,
              role: this.batchRoleForm.role
            }
          }
        });
        uni.showToast({
          title: `已为${this.selectedUsers.length}个用户分配角色`,
          icon: 'success'
        });
        this.showBatchRoleModal = false;
        this.selectedUsers = [];
        await this.refreshUsers();
      } catch (error) {
        uni.showToast({ title: error.message || '批量分配失败', icon: 'none' });
      }
    },

    // 获取角色显示名称
    getRoleNames(user) {
      if (!user.roles || user.roles.length === 0) {
        return '未分配';
      }
      return user.roles.map(r => StoreService.getRoleName(r)).join('、');
    }
  }
};
