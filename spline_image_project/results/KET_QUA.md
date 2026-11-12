# Kết quả chạy ngày 1–7

Ảnh tham chiếu 384 × 224 px. MAE đo trên ảnh đã chặn và làm tròn về 8 bit. Các số dưới đây tính từ một lần chạy có cấu hình cố định.

| Ảnh | Mức phóng | Song tuyến tính | Bicubic Keys | Spline tự nhiên |
|---|---:|---:|---:|---:|
| Biên tương phản | 2× | 0,3350 | 0,3336 | 0,3987 |
| Biên tương phản | 4× | 0,8905 | 0,8434 | 0,8481 |
| Nét mảnh và đường chéo | 2× | 8,6348 | 7,5106 | 7,7117 |
| Nét mảnh và đường chéo | 4× | 15,4914 | 15,1636 | 16,4544 |
| Hoa văn tần số thay đổi | 2× | 17,1261 | 12,2932 | 10,7038 |
| Hoa văn tần số thay đổi | 4× | 31,5908 | 27,8425 | 25,8521 |
| Camera · Lav Varshney | 2× | 4,7675 | 4,2003 | 4,1453 |
| Camera · Lav Varshney | 4× | 7,6999 | 7,0503 | 6,9854 |
| Astronaut · NASA | 2× | 4,8818 | 4,0278 | 3,8903 |
| Astronaut · NASA | 4× | 9,1741 | 8,0628 | 7,8843 |

## Hai bộ giải trên hàng pixel ở mức 4×

Mỗi hàng có 96 mẫu và 94 ẩn bên trong. Cùng vế phải cho cả hai bộ giải. Ngưỡng dừng tuyệt đối 10⁻⁸ theo chuẩn vô cùng.

| Hàng | Vòng GS | Phần dư Thomas | Phần dư GS | Sai khác đạo hàm cấp hai | Sai lệch mức xám trên lưới đầu ra |
|---|---:|---:|---:|---:|---:|
| Hàng biên thẳng, lấy từ hàng gốc 64–67 | 21 | 2.842e-14 | 3.287e-9 | 1.460e-9 | 4.281e-11 |
| Hàng hoa văn, lấy từ hàng gốc 112–115 | 22 | 3.411e-13 | 3.028e-9 | 1.310e-9 | 6.585e-11 |
| Hàng đối chứng hằng 128 | 0 | 0 | 0 | 0 | 0 |

Sai lệch mức xám ở cột cuối so với spline dùng Thomas, tính trước chặn và làm tròn trên 384 vị trí đầu ra.

- [Đồ thị phần dư](hoi-tu-gauss-seidel.png)
- [Mức sáng qua biên](mat-cat-bien.png)
- [Ảnh đối chiếu ở 4×](so-sanh-anh-4x.png)
- [Cấu hình, dữ liệu thô và lịch sử từng vòng](results.json)
