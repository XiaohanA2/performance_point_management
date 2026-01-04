// 动态计算当前季度
export const getCurrentQuarter = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `${year}Q${quarter}`;
};

// 导出当前季度值
export const CURRENT_QUARTER = getCurrentQuarter();

export const SCORING_RULES = [
  {
    id: 'p_agri_mortgage',
    name: '农户抵押类',
    category: 'personal',
    group: 'mortgage',
    icon: 'home',
    color: '#3b82f6',
    hasStockOption: true,
    stockLabel: '存量',
    pointsNew: { item: 3, million: 1 },
    pointsStock: { item: 1.5, million: 0 }
  },
  {
    id: 'p_biz_mortgage',
    name: '经营抵押类',
    category: 'personal',
    group: 'mortgage',
    icon: 'home',
    color: '#2563eb',
    hasStockOption: true,
    stockLabel: '存量',
    pointsNew: { item: 3, million: 1 },
    pointsStock: { item: 1.5, million: 0 }
  },
  {
    id: 'p_merchant_e',
    name: '商户e贷',
    category: 'personal',
    group: 'credit',
    icon: 'cart',
    color: '#ec4899',
    hasStockOption: false,
    pointsNew: { item: 1, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'p_consumer',
    name: '消费贷',
    category: 'personal',
    group: 'credit',
    icon: 'wallet',
    color: '#db2777',
    hasStockOption: false,
    pointsNew: { item: 1, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'p_fast_agri',
    name: '快农贷',
    category: 'personal',
    group: 'credit',
    icon: 'compose',
    color: '#f97316',
    hasStockOption: false,
    pointsNew: { item: 1, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_mortgage',
    name: '小微抵押类',
    category: 'micro',
    group: 'mortgage',
    icon: 'shop',
    color: '#0d9488',
    hasStockOption: true,
    stockLabel: '转贷',
    pointsNew: { item: 3, million: 1 },
    pointsStock: { item: 1.5, million: 0 }
  },
  {
    id: 'm_credit_transfer',
    name: '信用类-转贷',
    category: 'micro',
    group: 'credit',
    icon: 'redo',
    color: '#0ea5e9',
    hasStockOption: false,
    pointsNew: { item: 0.5, million: 0 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_micro_quick',
    name: '微捷贷',
    category: 'micro',
    group: 'credit',
    icon: 'flag',
    color: '#14b8a6',
    hasStockOption: false,
    pointsNew: { item: 1, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_min_e',
    name: '闽e贷',
    category: 'micro',
    group: 'credit',
    icon: 'flag',
    color: '#06b6d4',
    hasStockOption: false,
    pointsNew: { item: 1, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_offline_transfer',
    name: '线下-转贷',
    category: 'micro',
    group: 'offline',
    icon: 'redo',
    color: '#8b5cf6',
    hasStockOption: false,
    pointsNew: { item: 4.5, million: 0 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_tech',
    name: '科技贷',
    category: 'micro',
    group: 'offline',
    icon: 'gear',
    color: '#a855f7',
    hasStockOption: false,
    pointsNew: { item: 9, million: 1 },
    pointsStock: { item: 0, million: 0 }
  },
  {
    id: 'm_smart',
    name: '智动贷',
    category: 'micro',
    group: 'offline',
    icon: 'gear',
    color: '#f97316',
    hasStockOption: false,
    pointsNew: { item: 9, million: 1 },
    pointsStock: { item: 0, million: 0 }
  }
];

export const DEFAULT_BRANCHES = [
  { id: '1901', name: '营业厅' },
  { id: '1902', name: '郑和支行' },
  { id: '1903', name: '朝阳支行' },
  { id: '1921', name: '鹤上支行' },
  { id: '1918', name: '江田支行' },
  { id: '1917', name: '名郡支行' },
  { id: '1911', name: '金峰支行' },
  { id: '1909', name: '进城支行' },
  { id: '1907', name: '西洋支行' },
  { id: '1924', name: '锦江支行' },
  { id: '1915', name: '潭头支行' },
  { id: '1923', name: '玉田支行' },
  { id: '1913', name: '振兴支行' },
  { id: '1919', name: '漳港支行' },
  { id: '1912', name: '胪峰支行' },
  { id: '1910', name: '联新支行' },
  { id: '1920', name: '滨海支行' }
];

export const DEFAULT_USERS = [
  {
    name: '林鑫心',
    branch: '营业厅',
    phone: '13800000001',
    password: '123456',
    role: 'manager',
    status: 'active'
  },
  {
    name: '吴树雄',
    branch: '营业厅',
    phone: '13800000002',
    password: '123456',
    role: 'manager',
    status: 'active'
  },
  {
    name: '陈辉',
    branch: '江田支行',
    phone: '13800000003',
    password: '123456',
    role: 'manager',
    status: 'active'
  },
  {
    name: '黄森林',
    branch: '鹤上支行',
    phone: '13800000004',
    password: '123456',
    role: 'manager',
    status: 'active'
  },
  {
    name: '林生森',
    branch: '鹤上支行',
    phone: '13800000005',
    password: '123456',
    role: 'manager',
    status: 'active'
  },
  {
    name: '管理员',
    branch: '分行机关',
    phone: '13800000006',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    name: '管理员01',
    branch: '分行机关',
    phone: '15005070116',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  }
];
