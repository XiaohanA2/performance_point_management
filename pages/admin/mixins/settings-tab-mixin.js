import { StoreService } from '../../../services/store.js';

export const settingsTabMixin = {
  data() {
    return {
      settings: StoreService.getSettings()
    };
  },

  methods: {
    async updateSetting(key, value) {
      try {
        await StoreService.updateSettings({ [key]: value });
        this.settings = StoreService.getSettings();
        uni.showToast({ title: '设置已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '更新失败', icon: 'none' });
      }
    },

    refreshSettings() {
      this.settings = StoreService.getSettings();
    }
  }
};
