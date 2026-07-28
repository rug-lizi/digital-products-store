# Digital Products Store

面向海外用户的数字产品独立商店。当前生产版本运行在 ChatGPT Sites，使用 Stripe Checkout 收款，并在付款确认后提供限时、限次下载。

## 当前地址

- Sites 临时域名：<https://digital-products-store.liywcsrc.chatgpt.site>
- 正式域名：<https://shop.liyw.top>（DNS 与 HTTPS 验证中）
- 管理后台：`/admin`

正式域名验证完成前，不应引导真实用户付款；Stripe webhook 的生产地址仍为 `https://shop.liyw.top/api/webhook`。

## 架构

```text
浏览器
  → ChatGPT Sites / Vinext
  → Stripe Checkout
  → Stripe webhook
  → D1：订单、事件、后台会话、下载授权、加密运行配置
  → R2：6 个付费商品文件
```

## 已实现功能

- 6 个数字商品展示与购买
- Stripe Checkout 会话创建
- Stripe webhook 原始请求验签与幂等处理
- 支付成功、异步支付失败及退款状态同步
- 付款后生成 72 小时、最多 5 次的下载授权
- 退款后撤销下载授权
- 后台密码登录、限速与安全 Cookie
- 订单、访问和购买转化统计
- D1 持久化与 R2 私有商品交付

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm ci
npm run dev
```

常用检查：

```bash
npm test
npm run build
npm run validate:artifact
```

## 数据与密钥边界

- 真实 Stripe 密钥、webhook secret、后台密码和下载签名密钥不得写入 GitHub。
- `APP_SECRET` 仅保存在 Sites 加密环境中。
- 4 项迁移运行密钥使用 `APP_SECRET` 加密后保存在 D1。
- 付费商品文件仅保存在 R2，不进入 GitHub。
- D1 数据、订单邮箱、访问记录、数据库导出和迁移包不得进入仓库。
- 临时迁移 API、令牌、来源锁、私钥及中转包已从正式版本移除。

## 目录

```text
app/                 页面、API 与下载路由
db/                  D1 / Drizzle 数据结构
drizzle/             数据库迁移
worker/              Sites Worker 入口
public/              公开静态资源
tests/               渲染与产物检查
.openai/hosting.json Sites 项目标识及 D1/R2 绑定名
PROJECT-HANDOFF.md   当前状态、验收结果与后续工作
```

## 部署

本项目已绑定既有 ChatGPT Sites 项目。不要删除或改写 `.openai/hosting.json` 中的项目标识，也不要另建同名站点。生产发布应使用 Sites 的版本保存与部署流程，并在发布后检查部署状态。

详细的迁移记录、已完成验收与待办事项见 [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md)。
