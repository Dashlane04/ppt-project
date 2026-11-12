# Phương pháp tính · Nội suy spline và ngưỡng dừng Gauss–Seidel

Khi phóng ảnh bằng spline tự nhiên, cần giải một hệ ba đường chéo trên mỗi hàng và mỗi cột. Đề tài khảo sát cách đặt ngưỡng dừng Gauss–Seidel từ mức sai lệch cường độ cho phép, lấy kết quả tính bằng Thomas làm mốc. Phần mở rộng dùng khối voxel tổng hợp để minh họa cách tái lấy mẫu và tạo lát cắt trung gian.

## Tài liệu và sản phẩm

| Nội dung | Tệp |
|---|---|
| Báo cáo | [Tóm tắt](spline_image_project/BAO_CAO_TOM_TAT.md), [phương pháp và kiểm chứng](spline_image_project/BAO_CAO_NGAY_14.md), [phần nâng cao](spline_image_project/BAO_CAO_NANG_CAO.md) |
| Trình bày | [Bộ 16 slide PowerPoint](spline_image_project/Phuong_phap_tinh_Noi_suy_spline.pptx), [kịch bản và câu hỏi luyện bảo vệ](spline_image_project/TAP_BAO_VE_NGAY_18.md) |
| Tổ chức nhóm | [Bảng ý tưởng, đề cương và phân công](outputs/spline-nhom-3/De_cuong_va_phan_cong_nhom_3.xlsx) |
| Demo | Tải [demo.html](spline_image_project/demo.html) và mở trực tiếp trong trình duyệt |
| Thực nghiệm | [Mã nội suy](spline_image_project/src/interpolation.mjs), [dữ liệu và nguồn ảnh](spline_image_project/data/manifest.json), [kết quả và hình minh họa](spline_image_project/results/) |

## Chạy lại thí nghiệm

Cần Node.js có hỗ trợ `node --test` và Python 3. Các lệnh bên dưới chuẩn bị ảnh, chạy kiểm thử, tạo kết quả và dựng lại demo. Python dùng NumPy, Pillow và Matplotlib.

```sh
cd spline_image_project
python -m pip install numpy pillow matplotlib
python prepare_data.py
node --test verify.mjs
node run_experiments.mjs
python generate_figures.py
node run_day14.mjs
python generate_day14_figures.py
node run_3d.mjs
node run_advanced.mjs
python generate_advanced_figures.py
node build_demo.mjs
```

Các tập lệnh `run_*.mjs` chứa cấu hình từng thí nghiệm. Xem bảng số liệu và hình trong thư mục kết quả. [Kết quả 2D](spline_image_project/results/KET_QUA.md) · [Kết quả nâng cao và 3D](spline_image_project/results/advanced/KET_QUA_NANG_CAO.json)
