# API 接口说明

## 1. 登录接口

POST `/api/auth/login`

请求示例：

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

返回示例：

```json
{
  "token": "session-token",
  "user": {
    "id": 1,
    "name": "Sales Manager",
    "email": "admin@example.com",
    "role": "sales_manager"
  }
}
```

## 2. 元数据接口

GET `/api/metadata`

返回区域、品类、渠道、订单状态和日期范围。

## 3. 数据看板接口

GET `/api/dashboard`

支持查询参数：

```text
dateFrom=2025-01-01
dateTo=2026-06-30
region=South China
category=Electronics
channel=Online
status=Completed
```

返回内容包括：

```text
summary KPI 指标
trend 月度趋势
categories 品类排行
regions 区域排行
channels 渠道排行
topProducts 产品排行
dataHealth 数据质量检查
```

## 4. 订单明细接口

GET `/api/orders`

支持分页参数：

```text
page=1
pageSize=12
```

## 5. AI 报告接口

POST `/api/report/ai`

请求示例：

```json
{
  "filters": {
    "region": "South China",
    "category": "Electronics"
  }
}
```

如果未配置 DeepSeek API Key，系统返回本地规则生成的经营分析报告。

## 6. CSV 导入接口

POST `/api/import/csv`

请求示例：

```json
{
  "csvText": "order_id,date,region,..."
}
```

该接口要求用户角色为销售经理或数据分析师。
