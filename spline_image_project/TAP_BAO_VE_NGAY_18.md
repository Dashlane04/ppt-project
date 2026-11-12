# Kịch bản bảo vệ · Phóng to ảnh số bằng nội suy spline

Nhóm có **7 phút trình bày** và **5 phút hỏi đáp**. Câu hỏi chính là chọn ngưỡng phần dư Gauss–Seidel từ sai lệch mức xám cho phép. [Báo cáo chính](BAO_CAO_NGAY_14.md) · [Bảng phân công](../outputs/spline-nhom-3/De_cuong_va_phan_cong_nhom_3.xlsx)

## Nhịp trình bày

| Thời gian | Người nói | Nội dung |
|---|---|---|
| 0:00–0:35 | Phụ trách phương pháp | Nêu bài toán phóng ảnh và mức sai lệch $`\delta`$ cần kiểm soát. Dùng slide 1. |
| 0:35–1:35 | Thành viên 1 | Giới thiệu cách tạo ảnh nhỏ và ba trường hợp kiểm chứng là hàng hằng, biên gắt và hoa văn. Nêu mốc so sánh khi tính MAE. Dùng slide 2 hoặc hình trên slide 9. |
| 1:35–4:40 | Phụ trách phương pháp | Dẫn hệ ba đường chéo và giải thích vì sao dùng Thomas làm mốc. Trình bày hai hệ số $`1/2`$ và $`1/8`$ tạo chặn $`R/16`$. Nêu chặn 2D và đọc kết quả ảnh hoa văn. Dùng slide 4–8. |
| 4:40–6:15 | Thành viên 2 | Đổi ngưỡng trong demo ảnh hoa văn, rồi dùng lát phantom ở $`z=11`$ mm để minh họa tái lấy mẫu 3D. Dùng slide 15 cho lát phantom. |
| 6:15–7:00 | Phụ trách phương pháp | Trả lời câu hỏi nghiên cứu và nêu phạm vi của chặn. Nhắc rõ số lần cập nhật ẩn và sai lệch đầu ra dùng đơn vị gì. |

Cả ba thành viên tham gia hỏi đáp. Slide 10–11 có số liệu chia ngưỡng và PCHIP. Slide 16 có chặn 3D và hệ số lan truyền $`6{,}25`$. [Chi tiết thí nghiệm nâng cao](BAO_CAO_NANG_CAO.md)

## Demo và hình dự phòng

Mở demo trực tiếp trong trình duyệt và để sẵn ca ảnh hoa văn. Hai ca còn lại dùng khi luyện tập hoặc hỏi đáp. Nếu demo gặp trục trặc, chiếu ảnh dự phòng tương ứng với ca đang giải thích. [Demo offline](demo.html)

| Ca thử | Thao tác | Kết quả cần đọc | Ảnh dự phòng |
|---|---|---|---|
| So sánh MAE | Chọn **Nét mảnh và đường chéo** ở mức $`4\times`$. Đặt Keys bên trái và spline bên phải. | MAE **15,1636** với Keys và **16,4544** với spline, tính theo mức xám. | [So sánh ảnh nét mảnh](du_phong_demo/01-net-manh-4x.png) |
| Chặn 1D | Chọn **hàng biên** và $`\delta=0{,}1`$. | Ngưỡng phần dư **1,6**. Dừng sau **5 vòng**, sai lệch **0,0130** mức xám, dưới chặn **0,0407**. | [Dừng theo sai lệch 1D](du_phong_demo/02-dung-1d-nguong-01.png) |
| **Ca trình bày chính** | Chọn **hoa văn** và đặt $`\delta=0{,}1`$ với hai lượt dùng cùng ngưỡng. | Ngưỡng chung xấp xỉ **0,4571**. Tối đa 8 vòng theo hàng và 7 vòng theo cột. Sai lệch cực đại **0,0118** mức xám, dưới chặn **0,0992**. | [Dừng theo sai lệch 2D](du_phong_demo/03-dung-2d-nguong-01.png) |

Demo tự chỉnh thang màu theo sai lệch lớn nhất đang hiển thị. Để so độ lớn giữa các mức $`\delta`$, dùng [bản đồ với thang màu cố định](results/day14/ban-do-sai-lech-2d.png).

## Câu hỏi bảo vệ

**1. Bicubic Keys và spline đều dùng bậc ba. Khác nhau ở đâu?**

Keys lấy trọng số từ một hàm nhân cố định với bốn mẫu theo mỗi trục. Spline tự nhiên tìm các đạo hàm cấp hai qua một hệ chung cho cả dãy, rồi dùng chúng để nối các đoạn đa thức với đạo hàm đến cấp hai liên tục.

**2. Vì sao đặt đạo hàm cấp hai ở hai đầu bằng 0?**

Các điều kiện ghép tại nút bên trong cần thêm hai điều kiện biên để xác định spline. Chọn biên tự nhiên nghĩa là đặt độ cong bằng 0 ở hai đầu. Đây là giả thiết của mô hình và có thể ảnh hưởng đến vùng sát mép.

**3. Hệ số $`1/16`$ đến từ đâu?**

Viết $`r=Ae`$, trong đó $`e`$ là sai số của các hệ số spline. Tại chỉ số có sai số lớn nhất, đường chéo chính bằng 4 và tổng độ lớn hai hệ số kề tối đa bằng 2. Vì vậy $`\lVert e\rVert_\infty\le\lVert r\rVert_\infty/2`$. Khi trừ hai spline trên cùng dữ liệu, chỉ còn phần chứa đạo hàm cấp hai, với tổng độ lớn trọng số $`t(1-t)/2\le1/8`$. Kết hợp hai bất đẳng thức cho chặn $`R/16`$.

**4. Vì sao 2D dùng $`16\delta/3{,}5`$?**

Lượt dọc sinh sai lệch tối đa $`R_y/16`$. Sai lệch từ lượt ngang đi qua spline dọc chính xác với hệ số chặn $`2{,}5`$, nên phần này tối đa $`2{,}5R_x/16`$. Đặt cả hai phần dư dưới $`16\delta/(2{,}5+1)`$ thì tổng chặn không vượt $`\delta`$.

**5. Đã có Thomas thì vì sao dùng Gauss–Seidel?**

Thomas giải trực tiếp hệ ba đường chéo với chi phí $`O(n)`$ và cho mốc đối chiếu. Gauss–Seidel cho phép theo dõi phần dư qua từng vòng để kiểm chứng tiêu chuẩn dừng. Mỗi vòng có chi phí $`O(n)`$. Phép so sánh dùng số vòng, số lần cập nhật ẩn và sai lệch đầu ra.

**6. Sai lệch dưới 0,01 mức xám thì vì sao vẫn có pixel 8 bit khác?**

Hai giá trị ở hai phía của cùng ngưỡng nửa nguyên có thể làm tròn ra hai số nguyên liên tiếp. Ví dụ $`100{,}499`$ và $`100{,}501`$ chỉ chênh $`0{,}002`$, nhưng làm tròn thành $`100`$ và $`101`$.

**7. Có thể áp dụng kết quả MAE của bộ thử cho mọi ảnh không?**

Số $`6/10`$ tóm tắt bộ thử cụ thể, gồm 5 ảnh, hai mức phóng, một quy tắc thu nhỏ và một điều kiện biên. Mặt cắt biên còn cho thấy spline có thể vượt dải cường độ. Đọc MAE cùng ảnh và mặt cắt để biết lỗi xuất hiện ở đâu.

**8. Phần 3D liên quan đến CT ở bước nào?**

Sau khi đã có khối voxel, có thể nội suy để lấy mẫu trên một lưới hoặc mặt phẳng khác. Ở thí nghiệm 3D, bước voxel thay đổi từ $`2\times2\times3`$ mm sang $`1\times1\times1`$ mm. Lát ngang tại $`z=11`$ mm minh họa kết quả nội suy giữa hai lát đầu vào tại 9 và 12 mm. Kết quả định lượng thuộc về hai khối tổng hợp.

## Trước giờ trình bày

- Mở demo ở ca hoa văn, chuẩn bị hình dự phòng và lát phantom trong bộ slide.
- Bấm giờ một lượt đủ ba người. Nếu vượt 7 phút, rút phần mô tả từng phương pháp và giữ thời gian cho chứng minh, số liệu đối chiếu và demo.
- Khi nói một con số, gọi rõ đại lượng và mốc so sánh. MAE dùng dữ liệu tham chiếu. Sai lệch bộ giải dùng Thomas trên cùng spline. Chặn tính từ phần dư trước lượng tử hóa.
