# 06 · API 接口

## 1. 通用约定

- **Base URL**：本地 `http://localhost:3000`，接口同时挂载在 `/api/*` 与 `/*` 路径下。
- **响应结构**：所有接口统一返回 `{ code, data, message }`，`code=0` 表示成功。
- **错误**：业务错误返回非 0 的 `code` 与对应 HTTP 状态码；异步 handler 通过 `asyncHandler` 包装，异常统一交给 Express 错误中间件。
- **鉴权**：认证相关接口中，`/auth/me`、`/auth/logout` 需要 `Authorization: Bearer <JWT>`。

## 2. 接口清单（共 17 个）

### 基础与查询（6 个）

| 方法 | 路径 | 参数 | 说明 |
|---|---|---|---|
| GET | `/api/health` | — | 健康检查，返回服务状态与时间戳 |
| GET | `/api/provinces` | — | 省份列表 |
| GET | `/api/rank-lookup` | `score`, `province`, `subjectType` | 分数→位次换算 |
| GET | `/api/batch-lines` | `province`, `subjectType` | 批次线查询 |
| GET | `/api/subject-coverage` | `province`, `subjects`（逗号分隔） | 选科覆盖率查询 |

### 推荐与风险（5 个）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/recommend` | 固定考生（广东 585 分）的推荐，用于演示 |
| POST | `/api/recommend` | 按考生信息生成四梯度推荐（主接口） |
| POST | `/api/recommend/mock` | 显式 Mock 推荐，返回与前端一致的数据 |
| GET | `/api/risk` | 静态风险诊断数据（兜底 / 首屏占位） |
| POST | `/api/risk` | 基于考生信息与推荐方案的 LLM 风险诊断 |

### 认证（6 个）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/send-verification` | 发送邮箱验证码（TTL 5 分钟，冷却 60 秒） |
| POST | `/auth/verify-email` | 校验邮箱验证码 |
| POST | `/auth/register` | 注册（bcrypt 12 轮哈希） |
| POST | `/auth/login` | 登录（失败 5 次锁 15 分钟），返回 JWT |
| GET | `/auth/me` | 获取当前用户（需 Bearer Token） |
| POST | `/auth/logout` | 登出（需 Bearer Token） |

## 3. 请求 / 响应示例

### 3.1 位次查询

```http
GET /api/rank-lookup?score=585&province=%E5%B9%BF%E4%B8%9C%E7%9C%81&subjectType=%E7%89%A9%E7%90%86
```

```json
{
  "code": 0,
  "data": {
    "rank": 46934,
    "sameScore": 1262,
    "rangeMin": 46200,
    "rangeMax": 47500
  },
  "message": "ok"
}
```

### 3.2 生成推荐

```http
POST /api/recommend
Content-Type: application/json
```

```json
{
  "province": "广东省",
  "score": 585,
  "rank": 46934,
  "subjects": ["物理", "化学", "生物"],
  "preferences": {
    "collegeLevel": "211",
    "preferredCities": ["广州", "深圳"],
    "disciplines": ["工学"],
    "selectedMajor": "计算机科学与技术",
    "careerOrientation": "技术研发",
    "subjectType": "物理"
  },
  "weights": [40, 35, 25]
}
```

响应（节选）：

```json
{
  "code": 0,
  "data": [
    {
      "id": "univ-xxx-major-yyy",
      "college": "示例大学",
      "major": "计算机科学与技术",
      "city": "广州",
      "scores": [
        { "year": 2023, "score": 592 },
        { "year": 2024, "score": 596 },
        { "year": 2025, "score": 601 }
      ],
      "trend": "up",
      "probability": 28,
      "purity": 92,
      "tier": "冲",
      "planCount": 30,
      "tuition": 6850,
      "reason": "位次略高于往年线，专业匹配度高，可作为冲刺志愿"
    }
  ],
  "message": "ok"
}
```

> 上面院校名为结构示例。实际返回值来自数据库真实数据 + LLM 生成的理由。

### 3.3 风险诊断

```http
POST /api/risk
Content-Type: application/json
```

```json
{
  "input": { "province": "广东省", "score": 585, "subjects": ["物理", "化学", "生物"] },
  "recommendations": []
}
```

返回 6 项诊断数组，每项形如 `{ name, status, detail, sortOrder }`。

### 3.4 认证流程

```http
POST /auth/send-verification    { "email": "user@example.com", "type": "register" }
POST /auth/verify-email         { "email": "user@example.com", "code": "123456", "type": "register" }
POST /auth/register             { "email": "user@example.com", "password": "...", "nickname": "..." }
POST /auth/login                { "email": "user@example.com", "password": "..." }
```

登录成功返回 JWT：

```json
{ "code": 0, "data": { "token": "<jwt>", "user": { "email": "...", "isVerified": true } }, "message": "ok" }
```

## 4. 参数校验

- `rank-lookup`：`score` 必填且 0~900；`subjectType` 必填且须为合法枚举（物理/历史/综合改革/文科/理科/A类/B类），兼容带「类」后缀的写法。
- `batch-lines`：`province` 与 `subjectType` 均必填，后者做同样的枚举校验。
- `subject-coverage`：`province`、`subjects` 必填，`subjects` 支持中英文逗号分隔。
- `recommend`：`province` 与 `score` 必填；`preferences` 内的字段按类型逐项规范化，忽略非法类型。

## 5. 错误响应

```json
{ "code": 400, "data": null, "message": "缺少必要参数：province, score" }
```

常见状态码：

| 状态 | 场景 |
|---|---|
| 400 | 参数缺失或非法 |
| 404 | 位次查询无匹配数据 |
| 401 | JWT 缺失或无效（受保护路由） |
| 500 | 未捕获异常（由错误中间件统一处理） |
