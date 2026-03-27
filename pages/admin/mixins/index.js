/**
 * admin.vue Mixins
 *
 * 将admin.vue中各个tab的逻辑拆分为独立的mixins
 * 使用方式：在admin.vue中引入需要的mixins
 *
 * @example
 * import { overviewTabMixin, usersTabMixin } from './mixins';
 *
 * export default {
 *   mixins: [overviewTabMixin, usersTabMixin],
 *   // ...
 * }
 */

export { settingsTabMixin } from './settings-tab-mixin.js';
export { branchesTabMixin } from './branches-tab-mixin.js';
export { overviewTabMixin } from './overview-tab-mixin.js';
export { usersTabMixin } from './users-tab-mixin.js';
export { rulesTabMixin } from './rules-tab-mixin.js';
export { rolesTabMixin } from './roles-tab-mixin.js';
export { pfAdminMixin } from './pf-admin-mixin.js';

// 默认导出所有mixins
export const allTabMixins = [
  'settingsTabMixin',
  'branchesTabMixin',
  'overviewTabMixin',
  'usersTabMixin',
  'rulesTabMixin',
  'rolesTabMixin',
  'pfAdminMixin'
];
