# Phóng to ảnh và tái lấy mẫu khối 3D bằng nội suy spline

*Báo cáo tóm tắt bài tập lớn môn Phương pháp tính*

## Mục tiêu và cách làm

Khi phóng ảnh bằng spline tự nhiên, cần giải hệ tuyến tính trên từng hàng và cột. Đề tài tìm **ngưỡng dừng Gauss–Seidel từ mức sai lệch cường độ cho phép**, rồi kiểm chứng trên ảnh. Thí nghiệm 2D dùng năm ảnh xám $`384\times224`$. Mỗi ảnh được thu nhỏ bằng trung bình khối rồi phóng lại gấp 2 hoặc 4 lần với cùng quy ước tâm pixel.

- **So sánh phương pháp nội suy.** Dùng song tuyến tính, bicubic Keys và spline bậc ba tự nhiên trên cùng đầu vào. So sánh sai số tuyệt đối trung bình (MAE) với ảnh gốc sau lượng tử hóa 8 bit và dùng mặt cắt để quan sát dao động quanh biên.
- **Giải hệ spline.** Điều kiện ghép đạo hàm và biên tự nhiên cho hệ ba đường chéo với $`A=\operatorname{tridiag}(1,4,1)`$ trên lưới nút đơn vị. Thomas cho kết quả đối chiếu, còn Gauss–Seidel được chạy với các ngưỡng phần dư khác nhau.
- **Thử nghiệm mở rộng.** Đo khả năng giữ dải cường độ của PCHIP, so số lần cập nhật ẩn khi chia ngưỡng theo trục và áp dụng cùng quy trình trên hai khối voxel tổng hợp.

## Kết quả toán học và thí nghiệm 2D

Gauss–Seidel hội tụ trên hệ spline đang xét. Gọi $`R_a`$ là phần dư lớn nhất ở lượt nội suy theo trục $`a`$ và $`E`$ là sai lệch cực đại giữa hai bộ giải trước lượng tử hóa. Các chặn theo số chiều là

```math
\begin{aligned}
E_{\mathrm{1D}} &\le \frac{R_x}{16},\\
E_{\mathrm{2D}} &\le \frac{2{,}5R_x+R_y}{16},\\
E_{\mathrm{3D}} &\le \frac{6{,}25R_x+2{,}5R_y+R_z}{16}.
\end{aligned}
```

Chặn 1D kết hợp hệ số $`1/2`$ từ tính chéo trội với $`1/8`$ từ trọng số spline. Trong 3D, sai lệch của lượt đầu đi qua hai lượt nội suy chính xác còn lại, tạo hệ số $`2{,}5^2=6{,}25`$. Nếu dành tỷ lệ $`\alpha_a`$ của sai lệch cho phép $`\delta`$ cho trục $`a`$, đặt $`\tau_a=16\delta\alpha_a/w_a`$. Ở đây, $`w_a`$ là hệ số ứng với $`R_a`$ trong chặn và các tỷ lệ không âm có tổng bằng một.

| Thí nghiệm | Kết quả chính |
|---|---|
| 30 phép đo MAE cơ bản | Trong ba phương pháp chính, Keys có MAE thấp nhất ở 4/10 cặp ảnh–mức phóng, spline tự nhiên ở 6/10 cặp. |
| Kiểm chứng chặn 1D | Hàng biên $`4\times`$, $`\delta=0{,}1`$. Gauss–Seidel dừng sau 5 vòng, sai lệch đo trên 6.081 điểm là $`0{,}01301`$ mức xám. |
| Kiểm chứng chặn 2D | Ảnh hoa văn $`4\times`$, $`\delta=0{,}1`$. Sai lệch cực đại $`0{,}01179`$ mức xám, dưới chặn $`0{,}09918`$. |
| Chia ngưỡng ngang và dọc | So với mốc dùng cùng ngưỡng ở $`\delta=0{,}1`$, cấu hình tốt nhất trong các ca thử giảm **2,68%** số lần cập nhật trên ảnh biên và **8,53%** trên ảnh hoa văn. |
| PCHIP ở biên ảnh | Giữ dải cường độ đầu vào qua từng lượt. Với ảnh biên $`4\times`$, MAE là $`0{,}7143`$, so với $`0{,}8481`$ của spline tự nhiên. |

## Tái lấy mẫu và tạo lát cắt 3D

Thử nghiệm đầu nội suy giữa các lát Gaussian theo $`z`$. Phần mở rộng nội suy theo $`x\to y\to z`$, từ bước voxel $`2\times2\times3`$ mm sang $`1\times1\times1`$ mm. Hai khối tổng hợp gồm Gaussian trơn và phantom có vỏ sáng với biên gắt. MAE được tính trên **24.624 voxel ngoài lưới đầu vào**. Ba mặt cắt ngang, trán và dọc minh họa bước tái lấy mẫu sau khi đã có khối CT tái tạo.

| Khối 3D | MAE tuyến tính | MAE spline tự nhiên | MAE PCHIP |
|---|---:|---:|---:|
| Gaussian trơn | 1,0022 | **0,0895** | 0,2856 |
| Phantom biên gắt | 11,5900 | 14,4058 | **11,2396** |

Cả **24 ca** thử ngưỡng dừng 3D đều thỏa chặn. Với phantom ở $`\delta=0{,}1`$, cấu hình có ít lần cập nhật nhất trong bốn cách chia đã thử giảm **10,55%** so với mốc dùng cùng ngưỡng. Sai lệch cực đại so với Thomas là **0,02418**, tính theo đơn vị cường độ quy ước.

![Lát axial phantom tại z = 11 mm, giữa hai lát đầu vào ở z = 9 và 12 mm](results/advanced/lat-axial-phantom.png)

## Sản phẩm đã hoàn thành

- Đổi phương pháp nội suy, mức phóng và cách chia ngưỡng trong [demo chạy offline](demo.html).
- Xem chứng minh, thiết lập, số liệu và hình trong [báo cáo chính](BAO_CAO_NGAY_14.md) và [báo cáo nâng cao](BAO_CAO_NANG_CAO.md).
- Chuẩn bị trình bày với [bộ 16 slide](Phuong_phap_tinh_Noi_suy_spline.pptx), [kịch bản bảo vệ](TAP_BAO_VE_NGAY_18.md) và [ba ảnh dự phòng](du_phong_demo/). Mã thực nghiệm kèm [9 kiểm thử tự động](verify.mjs).
