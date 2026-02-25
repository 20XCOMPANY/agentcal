# routes/
> L2 | 父级: /AGENTS.md

成员清单
agents.ts: Agent CRUD 路由，校验 agent type/status 并返回标准化 Agent 数据。
calendar.ts: 日/周/月视图任务查询路由，按日期窗口返回任务集。
projects.ts: Project CRUD 主路由，并挂载 project 子路由模块。
system.ts: 系统状态与统计路由，暴露运行时指标与同步触发入口。
tasks.ts: Task 全生命周期路由，含调度/状态迁移/agent 协作动作。
projects/: 项目域子路由目录，按成员/活动/API key/webhook 拆分。

法则: 成员完整·一行一文件·父级链接·技术词前置

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
