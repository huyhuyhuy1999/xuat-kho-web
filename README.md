# Xuat Kho Web

Web static tạo phiếu xuất kho bán hàng từ nội dung đơn hàng và tải file `.xlsx` ngay trên trình duyệt.

## Cách dùng

1. Mở web.
2. Dán đơn hàng theo format đang dùng trong `donhang.txt`.
3. Chọn ngày phiếu và tên nhân viên bán hàng nếu cần.
4. Kiểm tra phần xem trước.
5. Bấm `Tạo XLSX`.

Nếu có nhiều đơn, web sẽ tải một file `.zip` chứa từng phiếu `.xlsx`.

## Format nhập

```text
Tên khách hàng
Địa chỉ
Tên hàng 10h giá 180k km 8h

Tên khách khác
Địa chỉ
Tên hàng 5h 120k
```

Hỗ trợ cả dòng có chữ `giá` và thiếu chữ `giá`, ví dụ `Men ống 10h 157k km 8h`.

## Deploy GitHub Pages

Repo dự kiến: `xuat-kho-web`.

1. Push các file trong thư mục này lên nhánh `main`.
2. Vào `Settings > Pages`.
3. Chọn `Deploy from a branch`.
4. Chọn branch `main`, folder `/root`.
5. Mở URL GitHub Pages được GitHub cung cấp.

Web chạy 100% trên trình duyệt và dùng CDN để tải ExcelJS/JSZip.
