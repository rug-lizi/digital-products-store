# 数字产品商店交接文档

> 版本：v3 安全重构版
> 更新时间：2026-07-27
> 线上地址：https://shop.liyw.top

## 1. 固定架构

本项目继续使用“腾讯云轻量服务器＋Caddy＋Stripe＋自有域名”。本次没有迁移托管平台，重做的是登录、订单、webhook 和下载权限。

```text
用户浏览器
  → Caddy（80/443、HTTPS）
  → Node.js（只监听 127.0.0.1:3000）
  → Stripe Checkout
  → SQLite（订单、事件、会话、下载权限）
  → 腾讯云非公开商品目录
```

## 2. 四个核心的现状

### 登录

- 管理员密码只从 `/etc/digital-shop.env` 读取。
- 登录成功后生成随机会话，数据库只保存 token 哈希。
- 浏览器使用 `HttpOnly + Secure + SameSite=Strict` Cookie，JavaScript 无法读取。
- 会话默认 8 小时，退出登录后立即撤销。
- 单 IP 连续失败 5 次后冷却 15 分钟。

### 订单

- 点击购买先生成 SQLite 待支付订单。
- Stripe Session ID、Price ID、金额、币种、顾客邮箱和支付时间写入订单。
- 只有 webhook 确认付款后，订单才变成 `paid`。
- Stripe API 创建失败时订单标记为 `failed`。

### Webhook

- 使用 Stripe 官方 Node SDK。
- 必须验证原始请求体和 `Stripe-Signature`。
- Stripe Event ID 在 SQLite 中唯一，重复通知不会重复计单。
- 支持同步支付成功、异步支付成功、异步支付失败和退款。
- 退款后订单标记为 `refunded`，现有下载权限立即撤销。

### 下载权限

- 未付款订单没有下载资格。
- 支付成功页凭 Stripe Session ID 查询本地订单状态。
- 下载 token 的哈希、有效期、下载次数和上限保存在 SQLite。
- 默认有效 72 小时、最多下载 5 次，可由环境变量修改。
- Node.js 重启后订单与权限仍存在。
- 文件以流方式发送，不公开真实服务器路径。

## 3. 重要安全边界

- GitHub 只保存代码、公开商品介绍和文件映射，不保存付费商品。
- 6 个付费文件必须位于服务器 `PRODUCT_ROOT` 指向的非公开目录。
- `.env`、数据库、访问统计、Stripe 密钥、webhook secret、后台密码不得进入 GitHub、聊天或交接文档。
- 旧 GitHub 历史曾包含完整商品和敏感交接信息，发布 v3 前必须清理历史或更换为全新仓库。
- 已公开过的商品内容应按“已泄露”处理；建议升级为新版后再正式销售。

## 4. 线上路径

| 内容 | 路径 |
|---|---|
| 应用目录 | `/home/ubuntu/digital-products/store` |
| 付费商品根目录 | `/home/ubuntu/digital-products` |
| 环境变量 | `/etc/digital-shop.env` |
| SQLite | `/home/ubuntu/digital-products/store/data/store.db` |
| systemd 服务 | `/etc/systemd/system/digital-shop.service` |
| Caddy 配置 | `/etc/caddy/Caddyfile` |

`products.json` 中的 `file` 是相对于 `PRODUCT_ROOT` 的路径。部署前必须逐一确认六个文件存在且名称匹配。

## 5. 环境变量

从 `.env.example` 复制配置结构。真实值只在服务器终端填写：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_PASSWORD`
- `DOWNLOAD_SIGNING_SECRET`
- `BASE_URL`
- `DATABASE_PATH`
- `PRODUCT_ROOT`
- 下载期限、次数和客服邮箱

`DOWNLOAD_SIGNING_SECRET` 应使用至少 32 个随机字符，与后台密码、Stripe 密钥互不相同。

## 6. Stripe webhook

线上 endpoint：

```text
https://shop.liyw.top/api/webhook
```

订阅事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `charge.refunded`

创建 endpoint 后，将 Stripe 提供的 `whsec_...` 写入服务器环境变量，不写入仓库。

## 7. 部署与运维

```bash
cd /home/ubuntu/digital-products/store
npm ci
npm test

sudo cp deploy/digital-shop.service /etc/systemd/system/digital-shop.service
sudo systemctl daemon-reload
sudo systemctl enable --now digital-shop

sudo cp Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

检查：

```bash
sudo systemctl status digital-shop --no-pager
sudo journalctl -u digital-shop --since "10 min ago" --no-pager
curl -I https://shop.liyw.top
```

不要再使用 `node server.js &` 或 `killall node`。

## 8. 上线验证清单

1. 首页可打开，HTTPS 证书正常。
2. 3000 端口只监听 `127.0.0.1`。
3. 错误后台密码返回 401，正确密码可进入统计页。
4. Stripe 测试付款产生一笔待支付→已支付订单。
5. 伪造 webhook 返回 400，Stripe Dashboard 的真实 webhook 返回 200。
6. 付款前无下载权限，付款后链接可用。
7. 超过下载次数后链接拒绝访问。
8. 重启 `digital-shop` 后原订单和下载权限仍存在。
9. 退款后旧链接失效。
10. GitHub 当前版本和历史中均无付费文件、密钥、密码和数据库。

## 9. 数据备份

至少每日备份：

- `data/store.db`
- 服务器非公开商品目录

SQLite 使用 WAL 模式。在线备份应使用 SQLite 的备份命令或先短暂停止服务，不要只复制单个 `.db` 而忽略可能存在的 WAL 文件。

## 10. 当前待完成

- GitHub 仓库已设为私有，远端 `main` 已于 2026-07-27 用 v3 无父提交替换，当前分支历史不再包含旧版付费文件。
- v3 已于 2026-07-27 部署到腾讯云 Lighthouse，`digital-shop` 已由 systemd 托管并设为开机自启，Node.js 只监听 `127.0.0.1:3000`，Caddy HTTPS 转发正常。
- 旧站完整备份位于 `/home/ubuntu/digital-products/store-backup-before-v3`，切换前的旧运行目录位于 `/home/ubuntu/digital-products/store-legacy-before-v3-live`。
- `/etc/digital-shop.env` 权限为 `600`；后台随机密码保存在服务器 root 专用文件 `/root/digital-shop-admin-password.txt`，不得写入仓库或聊天。
- Stripe 生产 webhook 已创建并启用，订阅本文件第 6 节列出的 4 个事件；生产 Checkout 会话创建、后台登录校验、systemd 重启和 SQLite 订单持久化测试均已通过。
- 当前部署临时沿用了旧版 Stripe Live Secret key。该密钥曾经公开，仍须在 Stripe Dashboard 中轮换；轮换后应立即更新 `/etc/digital-shop.env` 并重启、复核 `digital-shop`。
- 真实付款、下载次数限制、退款撤权和重启后持久化仍需使用一笔实际订单完成端到端验收。
- 旧 `tracking.json` 已随旧站目录保留；新版本不再依赖它。
