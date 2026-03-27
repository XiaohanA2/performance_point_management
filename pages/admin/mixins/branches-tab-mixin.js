import { StoreService } from '../../../services/store.js';

export const branchesTabMixin = {
  data() {
    return {
      branches: StoreService.getBranches(),
      showBranchModal: false,
      editingBranch: null,
      branchForm: { id: '', name: '' }
    };
  },

  methods: {
    openBranchModal(branch = null) {
      this.editingBranch = branch;
      this.branchForm = branch ? { ...branch } : { id: '', name: '' };
      this.showBranchModal = true;
    },

    closeBranchModal() {
      this.showBranchModal = false;
      this.editingBranch = null;
      this.branchForm = { id: '', name: '' };
    },

    async saveBranch() {
      const id = (this.branchForm.id || '').trim();
      const name = (this.branchForm.name || '').trim();

      if (!id || !name) {
        uni.showToast({ title: '请输入支行编号和名称', icon: 'none' });
        return;
      }

      try {
        if (this.editingBranch) {
          await StoreService.updateBranch(this.editingBranch.id, { id, name });
          uni.showToast({ title: '已更新支行', icon: 'success' });
        } else {
          await StoreService.addBranch({ id, name });
          uni.showToast({ title: '已新增支行', icon: 'success' });
        }

        this.closeBranchModal();
        this.refreshBranches();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },

    deleteBranch(branch) {
      uni.showModal({
        title: '删除支行',
        content: `确认删除【${branch.name}】？如有关联用户请先调整所属支行。`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteBranch(branch.id);
            uni.showToast({ title: '已删除', icon: 'success' });
            this.refreshBranches();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },

    refreshBranches() {
      this.branches = StoreService.getBranches();
    }
  }
};
