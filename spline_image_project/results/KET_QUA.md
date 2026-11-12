# Kết quả nội suy 2D và đối chiếu bộ giải

Ảnh tham chiếu có kích thước $`384\times224`$ pixel. Mỗi dòng so sánh ba phương pháp trên cùng ảnh nhỏ và cùng hệ số phóng. MAE tính theo mức xám sau khi đưa ảnh phóng về dải $`[0,255]`$ và làm tròn về 8 bit.

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

Mỗi hàng có 96 mẫu và 94 ẩn tại các nút trong. Thomas và Gauss–Seidel giải cùng hệ $`AM=b`$ trên từng hàng. Gauss–Seidel dừng khi $`\lVert b-A\widetilde M\rVert_\infty\le10^{-8}`$.

| Hàng | Vòng Gauss–Seidel | Phần dư Thomas | Phần dư Gauss–Seidel | Sai khác đạo hàm cấp hai | Sai lệch mức xám trên lưới đầu ra |
|---|---:|---:|---:|---:|---:|
| Hàng biên thẳng, lấy từ hàng gốc 64–67 | 21 | $`2{,}842\times10^{-14}`$ | $`3{,}287\times10^{-9}`$ | $`1{,}460\times10^{-9}`$ | $`4{,}281\times10^{-11}`$ |
| Hàng hoa văn, lấy từ hàng gốc 112–115 | 22 | $`3{,}411\times10^{-13}`$ | $`3{,}028\times10^{-9}`$ | $`1{,}310\times10^{-9}`$ | $`6{,}585\times10^{-11}`$ |
| Hàng đối chứng hằng 128 | 0 | 0 | 0 | 0 | 0 |

Cột cuối lấy sai lệch cực đại giữa hai spline trên 384 vị trí đầu ra, trước khi giới hạn dải và làm tròn. Ở hàng hằng, sai phân bậc hai bằng 0 nên nghiệm khởi tạo đã thỏa tiêu chuẩn dừng.

- [Đồ thị phần dư](hoi-tu-gauss-seidel.png)
- [Mức sáng qua biên](mat-cat-bien.png)
- [Ảnh đối chiếu ở 4×](so-sanh-anh-4x.png)
- [Cấu hình, dữ liệu thô và lịch sử từng vòng](results.json)
