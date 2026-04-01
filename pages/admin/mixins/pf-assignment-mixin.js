import { getEmployees, getEmployeeTasks, saveEmployeeTask } from '../../../services/pf-employee-service.js';
import { getCurrentPeriod, formatPeriod } from '../../../services/pf-service.js';

export default {
  data() {
    return {
      assignmentMode: 'by-business',
      assignmentPeriod: getCurrentPeriod(),
      selectedTaskId: null,
      assignmentEmployees: [],
      employeeTasks: [],
      employeeTasksMap: {},
      branchFilterIndex: 0,
      assignmentRoleIndex: 0,
      assignmentSearchKeyword: '',
      showUnassignedOnly: false,
      showEmployeeTaskModal: false,
      selectedEmployee: null,
      assignmentRoleOptions: [
        { label: '全部角色', value: null },
        { label: '客户经理', value: 'manager' },
        { label: '大堂经理', value: 'lobby_manager' },
        { label: '弹性柜面', value: 'elastic_counter' },
        { label: '柜面经理', value: 'counter_manager' }
      ],
      unassignedCache: null,
      virtualListSize: 30
    };
  },
  computed: {
    branchFilterOptions() {
      const branches = [{ id: null, name: '全部支行' }];
      const branchMap = new Map();
      this.assignmentEmployees.forEach(emp => {
        if (emp.branchId && !branchMap.has(emp.branchId)) {
          branchMap.set(emp.branchId, emp.branch);
          branches.push({ id: emp.branchId, name: emp.branch });
        }
      });
      return branches;
    },
    allFilteredEmployees() {
      let list = this.assignmentEmployees;
      const selectedBranch = this.branchFilterOptions[this.branchFilterIndex];
      const selectedRole = this.assignmentRoleOptions[this.assignmentRoleIndex];

      if (selectedBranch && selectedBranch.id) {
        list = list.filter(emp => emp.branchId === selectedBranch.id);
      }
      if (selectedRole && selectedRole.value) {
        list = list.filter(emp => emp.role === selectedRole.value);
      }
      if (this.assignmentSearchKeyword) {
        const keyword = this.assignmentSearchKeyword.toLowerCase();
        list = list.filter(emp =>
          emp.name?.toLowerCase().includes(keyword) ||
          emp.branch?.toLowerCase().includes(keyword)
        );
      }
      if (this.showUnassignedOnly) {
        if (!this.unassignedCache) {
          this.buildUnassignedCache();
        }
        list = list.filter(emp => this.unassignedCache.has(emp._id));
      }
      return list;
    },
    filteredEmployees() {
      return this.allFilteredEmployees.slice(0, this.virtualListSize);
    },
    hasMoreEmployees() {
      return this.allFilteredEmployees.length > this.virtualListSize;
    },
    filteredRequiredTasks() {
      const tasks = (this.pfRequiredTasks || []);
      if (!this.showUnassignedOnly) return tasks;
      const emps = this.filteredEmployees;
      return tasks.filter(task =>
        emps.some(emp => {
          const config = this.employeeTasks.find(t => t.employeeId === emp._id && t.taskId === task.taskId);
          return !config || !config.target;
        })
      );
    }
  },
  methods: {
    buildUnassignedCache() {
      const cache = new Map();
      const tasks = this.pfRequiredTasks || [];
      const taskMap = new Map();
      this.employeeTasks.forEach(t => {
        const key = `${t.employeeId}_${t.taskId}`;
        taskMap.set(key, t.target);
      });
      this.assignmentEmployees.forEach(emp => {
        const hasUnassigned = tasks.some(task => {
          const key = `${emp._id}_${task.taskId}`;
          const target = taskMap.get(key);
          return !target;
        });
        if (hasUnassigned) cache.set(emp._id, true);
      });
      this.unassignedCache = cache;
    },
    async loadAssignmentData() {
      try {
        const [employees, tasks] = await Promise.all([
          getEmployees(null, null),
          getEmployeeTasks(this.assignmentPeriod, null, null)
        ]);
        this.assignmentEmployees = employees || [];
        this.employeeTasks = tasks || [];

        // 如果当前月份没有任务配置，自动从上月复制
        if (tasks.length === 0) {
          try {
            const res = await uniCloud.callFunction({
              name: 'appService',
              data: { action: 'copyPreviousMonthTasks', payload: { period: this.assignmentPeriod, user: this.currentUser } }
            });
            if (res.result.data?.copied > 0) {
              uni.showToast({ title: `已从上月复制${res.result.data.copied}条配置`, icon: 'success' });
              // 重新加载数据
              const newTasks = await getEmployeeTasks(this.assignmentPeriod, null, null);
              this.employeeTasks = newTasks || [];
            }
          } catch (err) {
            console.log('复制上月配置失败:', err);
          }
        }

        // 构建 Map 加速查询
        const map = {};
        this.employeeTasks.forEach(t => {
          const key = `${t.employeeId}_${t.taskId}`;
          map[key] = t.target;
        });
        this.employeeTasksMap = map;

        this.unassignedCache = null;
        this.virtualListSize = 30;
        if (this.pfRequiredTasks && this.pfRequiredTasks.length > 0 && !this.selectedTaskId) {
          this.selectedTaskId = this.pfRequiredTasks[0].taskId;
        }
      } catch (error) {
        console.error('加载任务分配数据失败:', error);
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      }
    },
    handleAssignmentPeriodChange(e) {
      this.assignmentPeriod = this.pfPeriodOptions[e.detail.value];
      this.loadAssignmentData();
    },
    handleBranchFilterChange(e) {
      this.branchFilterIndex = e.detail.value;
      this.virtualListSize = 30;
    },
    handleRoleFilterChange(e) {
      this.assignmentRoleIndex = e.detail.value;
      this.virtualListSize = 30;
    },
    loadMoreEmployees() {
      this.virtualListSize += 30;
    },
    toggleUnassignedFilter() {
      this.showUnassignedOnly = !this.showUnassignedOnly;
      this.virtualListSize = 30;
    },
    onScrollToLower() {
      if (this.hasMoreEmployees) {
        this.loadMoreEmployees();
      }
    },
    getEmployeeTarget(employeeId, taskId) {
      const key = `${employeeId}_${taskId}`;
      return this.employeeTasksMap[key] || '';
    },
    async saveTarget(employeeId, taskId, value) {
      const target = parseInt(value) || 0;
      try {
        await saveEmployeeTask(employeeId, taskId, target, this.assignmentPeriod);
        const key = `${employeeId}_${taskId}`;
        this.employeeTasksMap[key] = target;

        const index = this.employeeTasks.findIndex(t => t.employeeId === employeeId && t.taskId === taskId);
        if (index >= 0) {
          this.employeeTasks[index].target = target;
        } else {
          this.employeeTasks.push({ employeeId, taskId, target, period: this.assignmentPeriod });
        }
        this.unassignedCache = null;
        uni.showToast({ title: '保存成功', icon: 'success', duration: 1000 });
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    openEmployeeTaskModal(employee) {
      this.selectedEmployee = employee;
      this.showEmployeeTaskModal = true;
    },
    closeEmployeeTaskModal() {
      this.showEmployeeTaskModal = false;
      this.selectedEmployee = null;
    },
    formatPeriod
  }
};
