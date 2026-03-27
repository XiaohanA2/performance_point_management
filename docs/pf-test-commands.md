# 个金系统测试命令

所有命令通过 HBuilderX 右键 `appService` → **上传并运行** 执行。
修改 `uniCloud-aliyun/cloudfunctions/appService/appService.param.json` 后运行。

---

## 1. 查询大堂经理用户列表

```json
{
  "action": "getLobbyManagers",
  "payload": {}
}
```

返回所有 `lobby_manager` 角色用户的 `_id`、`name`、`branch`。

---

## 2. 插入大堂经理组测试数据（321条，2026-03）

基于《全员考核进度表26年1月31日总 (2.4).xls》大堂经理组真实数据生成。
运行后自动触发全组重算，前端刷新即可看到完整数据。

```json
{
  "action": "seedPFTestData",
  "payload": {
    "records": [...],  // 见 /tmp/pf_records_clean.json，或重新运行 scripts/gen-seed.py 生成
    "period": "2026-03"
  }
}
```

> 重新生成 seed 数据：
> ```bash
> cd /Users/chenzhuoyang/repo/Workspace/performance_point_management
> python3 -c "
> import pandas as pd, json
> # ... 见历史对话
> " > /tmp/pf_records_clean.json
> ```

---

## 3. 清除测试数据

删除所有 `isTest: true` 的提报记录，并清空大堂经理组当月统计。

```json
{
  "action": "cleanupPFTestData",
  "payload": { "period": "2026-03" }
}
```

---

## 4. 手动触发单用户重算

直接在数据库增删提报记录后，需手动触发重算同步 `pf_monthly_stats`。

```json
{
  "action": "recalculatePFStats",
  "payload": {
    "userId": "1764693439045_ixbdac",
    "period": "2026-03"
  }
}
```

> 超管 userId: `1764693439045_ixbdac`
> **注意**：重算会同步整组（同角色所有人），不只是单人。

---

## 典型测试流程

1. 运行 `recalculatePFStats` 清空旧数据（如有）
2. 运行 `seedPFTestData` 插入测试数据
3. 用大堂经理账号登录前端，切到「岗位穿透」tab 验证
4. 手动提报/删除，观察卡片实时更新
5. 测试完运行 `cleanupPFTestData` 清除
