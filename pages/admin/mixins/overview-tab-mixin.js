import { StoreService } from '../../../services/store.js';

export const overviewTabMixin = {
  data() {
    return {
      overviewData: [],
      leaderboard: [],
      searchKeyword: '',
      selectedQuarter: StoreService.getCurrentQuarter(),
      quarterOptions: ['2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4', '2027Q1', '2027Q2', '2027Q3', '2027Q4', '2028Q1', '2028Q2', '2028Q3', '2028Q4']
    };
  },

  computed: {
    filteredOverviewData() {
      const keyword = this.searchKeyword.trim().toLowerCase();
      let filtered = this.overviewData.filter(
        item =>
          (!keyword || item.employee.name.toLowerCase().includes(keyword) || (item.employee.branchName || item.employee.branch).toLowerCase().includes(keyword))
      );

      // Sort by total score descending
      filtered.sort((a, b) => b.stats.totalScore - a.stats.totalScore);

      return filtered;
    }
  },

  methods: {
    async refreshOverviewData() {
      try {
        // Get overview data for selected quarter
        this.overviewData = StoreService.getOverviewTable(this.selectedQuarter);

        // Build leaderboard
        const rankedData = [...this.overviewData].sort((a, b) => b.stats.totalScore - a.stats.totalScore);
        this.leaderboard = rankedData.map((item, index) => ({
          employeeId: item.employee.id,
          rank: index + 1
        }));
      } catch (error) {
        console.error('Failed to refresh overview data:', error);
      }
    },

    handleOverviewQuarterChange(e) {
      this.selectedQuarter = this.quarterOptions[e.detail.value];
      // Reload data to reflect selected quarter
      this.refreshOverviewData();
    },

    getRank(employeeId) {
      return this.leaderboard.find(entry => entry.employeeId === employeeId)?.rank || '-';
    },

    formatBranchName(name) {
      // Insert line break every 2 characters
      return name.replace(/(.{2})/g, '$1\n');
    },

    gotoUserDetails(employee) {
      uni.navigateTo({
        url: `/pages/admin/user-details/user-details?employeeId=${employee.id}&name=${encodeURIComponent(employee.name)}&branch=${encodeURIComponent(employee.branchName || employee.branch)}`
      });
    }
  }
};
