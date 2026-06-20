# Project Review Report

## 1) Config

### Hiện trạng
- `src/config/database.ts` đã tách cấu hình DB, có validate env bắt buộc (`DATABASE_URL`) và optional (`DIRECT_URL`).
- Tuy nhiên app vẫn đọc env trực tiếp ở nhiều nơi:
  - `src/index.ts` đọc `PORT`.
  - `src/middleware/auth.middleware.ts` đọc `JWT_ACCESS_SECRET`.
  - `src/lib/prisma.ts` đọc lại `DATABASE_URL`.
- Có trùng lặp nguồn cấu hình DB giữa `src/config/database.ts` và `src/lib/prisma.ts`.

### Đánh giá
- ✅ Có bước validate env khi startup.
- ⚠️ Chưa đúng một điểm tập trung cấu hình (single source of truth).
- ⚠️ Dùng `console.log/error` trong config (`database.ts`) làm logging chưa thống nhất.

### Đề xuất
- Tập trung toàn bộ env vào `src/config/*` (app/auth/database).
- `prisma.ts`, `index.ts`, middleware chỉ import config typed thay vì đọc `process.env` trực tiếp.
- Chuẩn hóa logging (logger dùng chung thay cho `console`).

---

## 2) Controllers

### Hiện trạng
- Các controller khá mỏng: parse DTO Zod → gọi service → trả response JSON.
- Trích user từ `req.authUser!.id` (không lấy userId từ client) là đúng hướng.
- Có lặp lại hàm `getRouteParam` ở hầu hết controller.

### Đánh giá
- ✅ Tách boundary HTTP và business logic khá rõ.
- ✅ Format response có cấu trúc nhất quán (`success`, `data`).
- ⚠️ Lặp code ở lớp controller (DRY chưa tốt).
- ⚠️ Dùng non-null assertion `req.authUser!` nhiều nơi, phụ thuộc mạnh vào middleware/route wiring.

### Đề xuất
- Tạo helper dùng chung cho route params để tránh lặp.
- Cân nhắc typed request cho route đã qua auth để giảm phụ thuộc `!`.

---

## 3) Services

### Hiện trạng
- Service chứa business rules tốt: permission check, state check, conflict/not-found.
- `PostService`, `ChatMessageService`, `CommunityGroupService` xử lý logic theo đúng vai trò orchestration.
- Có publish realtime event sau thao tác ghi dữ liệu.
- Phân trang cursor pattern nhất quán (`take limit + 1`, cắt `items`, trả `nextCursor`).

### Đánh giá
- ✅ Business invariants khá đầy đủ (membership, role, trạng thái request).
- ✅ Tầng service không phụ thuộc Express `req/res`.
- ⚠️ Có logic lặp về cursor paging ở nhiều service.
- ⚠️ Một số side-effect realtime chưa có `try/catch` riêng (nếu publisher lỗi có thể ảnh hưởng luồng chính tùy implementation).

### Đề xuất
- Tách helper paging dùng chung để giảm duplicate.
- Làm rõ chính sách lỗi cho side-effect realtime/notification (best-effort hay fail-fast).

---

## 4) Repositories

### Hiện trạng
- Prisma query được gom đúng vào repository layer.
- Constructor injection có default `prisma` giúp test/mock thuận tiện.
- Có hỗ trợ transaction ở nơi cần thiết (`CommunityGroupRepository`, `ChatGroupRepository`).

### Đánh giá
- ✅ Layering tốt: query không rò lên controller.
- ✅ Query tương đối rõ ràng, có index-friendly order/cursor.
- ⚠️ `NotificationRepository.createMany` đang `Promise.all(create)` thay vì `createMany` (nếu không cần return full row có thể tối ưu).
- ⚠️ `CommunityGroupPermissionRepository.seedGroupRoles` gọi nhiều query lồng vòng lặp, có thể tốn chi phí khi seed lớn.

### Đề xuất
- Với batch lớn, cân nhắc giảm round-trip DB (bulk strategy phù hợp).
- Chuẩn hóa guideline khi nào cần return entity đầy đủ vs chỉ count/id.

---

## 5) Model

### Hiện trạng
- `prisma/schema.prisma` thiết kế dữ liệu khá đầy đủ cho social graph, community/group role, chat/realtime, notification.
- Index và unique constraints tương đối tốt ở các luồng chính.
- `src/models/permission.model.ts` dùng để mô tả domain permission rõ ràng.
- `src/models/post.model.ts` và `src/models/user.model.ts` đang rỗng.

### Đánh giá
- ✅ Schema mạnh, bao quát domain tốt.
- ✅ Permission model rõ và dễ mở rộng.
- ⚠️ Có dấu hiệu model layer chưa nhất quán mục đích (2 file model rỗng).

### Đề xuất
- Nếu chưa dùng `post.model.ts`/`user.model.ts`, nên xóa hoặc bổ sung kiểu domain thực sự cần thiết để tránh nhiễu.
- Làm rõ quy ước: khi nào dùng Prisma generated types, khi nào tạo domain model riêng.

---

## 6) Types

### Hiện trạng
- `src/types/express.ts` augment `Express.Request` với `authUser`.

### Đánh giá
- ✅ Đúng hướng để typed auth context xuyên suốt app.
- ⚠️ Hiện tại chỉ có một file type; một số shared type đang nằm rải ở service/repository.

### Đề xuất
- Gom các shared app-level type (pagination/result/common payload) vào `src/types` để tăng tính nhất quán.

---

## 7) Utils (hiện tại là `lib/`)

### Hiện trạng
- `api-error.ts`: chuẩn hóa lỗi API tốt.
- `async-handler.ts`: utility nhỏ, đúng mục tiêu.
- `crypto.ts`: hash token rõ ràng.
- `prisma.ts`: singleton Prisma client dùng adapter pg.

### Đánh giá
- ✅ Bộ utility/lib cốt lõi gọn và thực dụng.
- ⚠️ `lib/prisma.ts` vẫn đọc env trực tiếp (liên quan vấn đề config trung tâm).
- ⚠️ Logging lỗi/chuẩn hóa logger chưa đồng nhất giữa các file.

### Đề xuất
- Đồng bộ lại boundary giữa `config/` và `lib/`.
- Bổ sung logger chung nếu mục tiêu là structured logging nhất quán.

---

## Tổng kết nhanh

### Điểm mạnh chính
- Kiến trúc layer rõ (DTO → Controller → Service → Repository).
- Service chứa business rules hợp lý, test coverage hiện có tốt.
- Schema Prisma và quan hệ dữ liệu được thiết kế khá đầy đủ cho social backend.

### Ưu tiên cải thiện
1. **Chuẩn hóa config tập trung** (tránh đọc env rải rác, bỏ duplicate DB config).
2. **Giảm lặp code controller/service** (`getRouteParam`, cursor pagination helper).
3. **Làm sạch model/types structure** (xử lý file model rỗng, thống nhất shared types).
4. **Chuẩn hóa logging** (giảm `console.*`, thống nhất logger).
