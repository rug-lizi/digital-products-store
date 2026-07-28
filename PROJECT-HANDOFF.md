# Digital Products Store 项目交接文档

> 更新时间：2026-07-28  
> 当前版本：ChatGPT Sites 迁移版 v6  
> GitHub：`rug-lizi/digital-products-store`（私有仓库，`main`）  
> Sites 临时地址：https://digital-products-store.liywcsrc.chatgpt.site  
> 正式域名：https://shop.liyw.top

## 1. 当前结论

商店程序和业务数据已经从腾讯云上海服务器迁入 ChatGPT Sites。新站已公开部署，后台登录、Stripe Checkout、webhook 拒绝伪造请求、订单数据和商品文件均已核验。

整次迁移尚未完全收尾：`shop.liyw.top` 在 Sites 后台仍为 `pending`，HTTPS 状态为 `pending_validation`；腾讯云旧站也尚未清理。因此当前应把 Sites 临时地址视为已验收的新程序，把正式域名切换和腾讯云清理视为下一次继续处理的生产收尾。

## 2. 当前架构

```text
用户浏览器
  → ChatGPT Sites / Vinext
  → Stripe Checkout
  → Stripe webhook
  → D1：订单、webhook、访问事件、后台会话、下载授权、加密运行配置
  → R2：6 个付费商品文件
```

腾讯云时代的 Node 常驻进程、Caddy、systemd、SQLite 文件和服务器商品目录不再是新站架构的一部分。

## 3. 已完成的迁移

- 新建并公开部署 Digital Products Store Sites 项目，当前为第 6 个生产版本。
- 完成商店首页、后台、Checkout、webhook、订单状态、下载和退款撤权流程。
- D1 已迁入：
  - 订单 4 条；
  - webhook 记录 0 条；
  - 访问事件 12 条；
  - 历史下载授权 0 条。
- R2 已迁入 6 个付费商品文件，文件名和字节数已逐项对账。
- 4 项运行密钥已迁入；它们使用 Sites 环境中的 `APP_SECRET` 加密保存于 D1。
- 按用户决定，不保留旧版下载令牌，也不实现旧令牌兼容；未来付款只生成新版下载授权。
- 一次性迁移入口、短期令牌、来源锁、临时明文、一次性私钥和中转密文均已删除。
- 腾讯云上的加密中转文件已确认删除。

## 4. 已完成的功能验收

- 旧后台密码登录返回 401。
- 迁移后的后台密码可以登录。
- 后台 Cookie 已确认使用 `HttpOnly`、`Secure`、`SameSite=Strict`。
- 退出登录后会话立即失效。
- Stripe Checkout 可创建会话并跳转到 `checkout.stripe.com`。
- 伪造 webhook 返回 400。
- Stripe 后台目前只有一个启用的生产 endpoint：
  `https://shop.liyw.top/api/webhook`
- endpoint 订阅 4 个事件：
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `charge.refunded`
- 6 个商品、4 条订单和 12 条访问事件的新旧数量一致。

上述检查没有产生实际扣款。真实付款、下载次数耗尽及退款后的端到端验收仍应在正式域名生效后用一笔真实订单完成。

## 5. 域名现状

阿里云 DNS 已按 Sites 要求设置 `shop.liyw.top`：

- TXT：`_openai-site-verification.shop`
- TXT：`_cf-custom-hostname.shop`
- CNAME：`shop → custom-domains.chatgpt.site`
- 原腾讯云 A 记录 `shop → 122.51.209.156` 已由用户删除。

截至 2026-07-28 最近一次平台核验：

- 域名状态：`pending`
- provider 状态：`pending`
- HTTPS：`pending_validation`
- 平台未返回配置错误。

下一次继续时，应先刷新 Sites 自定义域名状态，并从公网确认 DNS、HTTPS 和实际页面响应。不要仅凭 DNS 控制台已添加记录就宣布域名迁移完成。

## 6. 安全边界

- 真实密钥、后台密码、顾客邮箱、订单内容、数据库导出和付费商品不得进入 GitHub、聊天或本文档。
- `.openai/hosting.json` 只保存 Sites 项目标识和逻辑绑定名，不保存运行密钥。
- 付费商品只保存在 R2。
- `APP_SECRET` 只保存在 Sites 加密环境。
- 迁移 API 已从正式代码和生产部署中移除，不应重新加入。
- GitHub 当前代码应保持为 Sites 架构，不再把腾讯云部署文件作为生产方案。

## 7. 待完成事项（按顺序）

1. 刷新并确认 `shop.liyw.top` 域名状态变为 `active`，HTTPS 证书有效。
2. 通过正式域名复验首页、后台登录、Checkout 和 webhook。
3. 使用一笔真实订单验证：付款成功、下载可用、次数限制、退款后撤权。
4. 确认新站稳定后，清理腾讯云旧商店：
   - 停止并禁用旧 `digital-shop` 服务；
   - 删除旧站运行目录、SQLite、商品副本、环境变量文件、Caddy 中的 `shop.liyw.top` 配置及临时备份；
   - 只清理数字商店相关内容，不影响同一服务器上的 Hermes Agent 或其他服务；
   - 清理后复核磁盘空间和剩余监听端口。
5. 在 Stripe 后台确认生产 webhook 连续返回 2xx。
6. 更新本文档，将域名、真实付款验收和腾讯云清理状态改为完成。

在第 1～3 步完成前，不建议向真实用户推广商店。

## 8. 后续维护

- 修改代码前先打开现有 Sites 项目，禁止重新创建同名项目。
- 保留 `.openai/hosting.json`、D1 绑定 `DB` 和 R2 绑定 `BUCKET`。
- 数据结构变化必须生成并检查新的 Drizzle migration。
- 每次生产发布后检查 Sites 部署状态，并复验 Checkout 与 webhook。
- Stripe 密钥、webhook secret、后台密码或下载签名密钥轮换时，应更新加密运行配置，不能提交到仓库。
- 每次用户说“今天就到这”时，先询问是否更新交接文档并将代码推送 GitHub。

