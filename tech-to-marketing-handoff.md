# Tech-to-Marketing Handoff

> 技术与营销协作记录
> 更新时间：2026-07-27

## 角色分工

| 角色 | 职责 |
|---|---|
| 技术端 | 网站运维、安全修复、功能开发、部署、支付与交付可靠性 |
| 营销端 | GEO/SEO 内容、社媒发布、流量与转化分析、用户反馈整理 |

## 营销端可用信息

- 商店：https://shop.liyw.top
- GitHub：https://github.com/rug-lizi/digital-products-store
- 后台：https://shop.liyw.top/admin
- 商品数：6
- 支付：Stripe Checkout
- 交付承诺：支付经 webhook 确认后提供限时、限次下载

后台密码、Stripe 配置、服务器凭证和顾客订单不得通过本文件共享。

## 技术状态

v3 保留腾讯云、Caddy、Stripe 和自有域名，重构以下核心：

- SQLite 持久化订单；
- Stripe webhook 验签与事件去重；
- 付款后才创建下载资格；
- 下载权限限时、限次，退款后撤销；
- HttpOnly 管理员会话；
- systemd 自动启动。

完整部署与运维说明见 `PROJECT-HANDOFF.md`。

## 内容发布现状

| 平台 | 已发布数量 |
|---|---:|
| GitHub README | 1 |
| Dev.to | 1 |
| Medium | 1 |
| Reddit | 2 |
| Hacker News | 1 |
| Quora | 7 |

待发布内容仍位于 `blog/`。发布前需检查其中技术描述是否仍引用旧版“内存 token / tracking.json”方案，并改成 v3 真实流程。

## 协作规则

技术端记录：

- 网站 URL 或页面结构变化；
- 商品上下架；
- 支付、下载、后台故障及恢复；
- 会影响宣传承诺的新功能。

营销端记录：

- 流量与转化异常；
- 顾客付款或下载反馈；
- 需要技术配合的 SEO 调整；
- 新落地页需求。

任何交接文档均不得记录密码、API key、webhook secret、银行信息、证件信息或顾客数据。

## 变更日志

| 日期 | 变更 |
|---|---|
| 2026-07-27 | 商店最初上线 |
| 2026-07-27 | HTTPS 证书采用 RSA2048 |
| 2026-07-27 | 启动 v3 安全重构：登录、订单、webhook、下载权限 |
| 2026-07-27 | 从新版代码树移除 6 个付费商品正文，并禁止再次提交 |
