// 测试导出数据结构
const period = '2026-03';
console.log('测试查询 period:', period);
console.log('请在云函数中执行以下代码查看 taskScores 字段：');
console.log('db.collection("pf_monthly_stats").where({period:"2026-03"}).limit(1).get()');
