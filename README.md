# Blue Rental booking website

这是一个参考 `bluerental.co.nz` 重新整理的 Blue Rental 预订网站雏形，包含：

- Blue Rental 风格首页、查询栏、车辆列表和预订弹窗
- 后端 API 层，用来隐藏 Rental Car Manager 和 Stripe 密钥
- 演示库存模式，无真实密钥也能跑完整流程
- Stripe Checkout 定金支付入口
- Rental Car Manager API 适配层集中在 `server.mjs`

## 运行

1. 复制环境配置：

```powershell
Copy-Item .env.example .env
```

2. 安装依赖并启动：

```powershell
pnpm install
pnpm start
```

3. 打开：

```text
http://localhost:4317
```

也可以直接打开 `public/index.html` 预览页面样式；如果要运行车辆查询、创建预订和定金支付流程，请保持本地服务运行并使用上面的 localhost 地址。

## 接入 Stripe 定金支付

在 `.env` 填入：

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_DEPOSIT_PERCENT=10
STRIPE_CURRENCY=nzd
SITE_URL=http://localhost:4317
```

未配置 Stripe 密钥时，网站会使用模拟支付成功页，方便先看完整体验。定金按订单总金额的 10% 计算，可通过 `STRIPE_DEPOSIT_PERCENT` 调整。

## 接入 Rental Car Manager

在 `.env` 填入 RCM sandbox/live 信息，并关闭演示数据：

```text
RCM_API_BASE_URL=https://apis.rentalcarmanager.com
RCM_API_KEY=your_key
RCM_SECRET=your_secret
RCM_USE_DEMO_DATA=false
```

RCM 的公开说明显示 API v3.2 覆盖 location、category、available cars、rates、booking、edit booking、cancel booking 等流程；完整字段、认证方式和测试工具需要登录 RCM sandbox 获取。

目前 `server.mjs` 中的 RCM 路径集中在：

- `POST /api/availability` -> `callRcm('/v3.2/availability', search)`
- `POST /api/bookings` -> `callRcm('/v3.2/bookings', booking)`

拿到你的 RCM sandbox 文档后，只需要在 `callRcm` 和这两个路径处按官方字段名做一次映射即可。

## 上线前建议

- 增加 Stripe webhook，付款成功后把 deposit paid 状态写回 RCM
- 增加客户确认邮件
- 增加条款、保险选项、附加驾驶员、儿童座椅等附加产品
- 把图片换成 Blue Rental 真实车辆照片
