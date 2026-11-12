# Kịch bản bảo vệ · Phóng to ảnh số bằng nội suy spline

Thời lượng dự kiến **8 phút**, trong đó có **90 giây demo**. Câu hỏi xuyên suốt là làm sao chọn ngưỡng phần dư từ một mức sai lệch pixel chấp nhận được. [Báo cáo có chứng minh và số liệu đầy đủ](BAO_CAO_NGAY_14.md)

## Nhịp trình bày

| Thời gian | Slide | Nội dung nói |
|---|---|---|
| 0:00–0:45 | 1–2 | Mở bằng hai câu hỏi. Cách nội suy nào cho MAE thấp hơn trên từng ảnh? Khi dùng spline, phần dư bao nhiêu là đủ để khống chế sai lệch mức xám? Nêu 5 ảnh, hai mức phóng và cách dùng cùng một ảnh đầu vào cho mỗi so sánh. |
| 0:45–2:00 | 3–5 | Song tuyến tính lấy 4 mẫu, bicubic Keys lấy đến 16 mẫu. Với spline, ghép đạo hàm tại các nút tạo ra hệ ba đường chéo. Thomas cho kết quả đối chiếu. Gauss–Seidel cho phép theo dõi quá trình dừng theo phần dư. |
| 2:00–3:30 | 6 | Chỉ ra hai hệ số \(1/2\) và \(1/8\). Hệ số đầu đến từ đường chéo trội, hệ số sau từ công thức spline. Nêu thêm hệ số khuếch đại tối đa \(2{,}5\) khi sai lệch ngang đi qua lượt dọc. |
| 3:30–4:40 | 7–9 | Đọc một ca ở \(\delta=0{,}1\) trên 1D và 2D. Khi sang biểu đồ MAE, nói rõ mốc so sánh đổi sang ảnh gốc. Đối chiếu ảnh biên và hoa văn để thấy kết quả phụ thuộc vào cấu trúc mẫu. |
| 4:40–6:10 | Demo | Chạy ba cảnh theo bảng bên dưới. Dừng ở hình sai lệch 2D rồi chuyển sang lưới voxel. |
| 6:10–7:30 | 12–14 | Giải thích ba trục, lát MPR của khối CT đã tái tạo, rồi mô phỏng Gaussian. Chỉ thay đổi trục \(z\). Kết quả 4,07 và 0,37 là MAE trên tám lát kiểm tra của khối mô phỏng. |
| 7:30–8:00 | Kết luận | Chốt hai kết quả. Keys và spline có lợi thế ở các cấu trúc khác nhau trong bộ thử. Với cùng mô hình spline, có thể đặt ngưỡng dừng dựa trên mức sai lệch pixel cần kiểm soát. |

Nếu có thêm thời gian, dùng slide **10–11** để trình bày cách chia ngưỡng và PCHIP sau phần so sánh 2D. Dùng slide **15–16** để đối chiếu lát phantom và giải thích hệ số \(6{,}25\) trong chặn 3D. Khi cần minh họa trực tiếp, chọn **PCHIP** ở một bên hoặc đổi **phần sai lệch dành cho lượt ngang** trong demo. [Chi tiết thí nghiệm nâng cao](BAO_CAO_NANG_CAO.md)

## Demo 90 giây và phương án dự phòng

Mở [demo.html](demo.html) trực tiếp trong trình duyệt. Chuẩn bị sẵn ba ảnh PNG theo thứ tự. Nếu trình duyệt gặp trục trặc, chuyển sang ảnh của cảnh đang nói và tiếp tục theo cùng kịch bản.

| Thời lượng | Thao tác | Kết quả cần đọc | Ảnh dự phòng |
|---|---|---|---|
| 30 giây | Chọn **Nét mảnh và đường chéo**, \(4\times\). Đặt Keys bên trái, spline bên phải | MAE **15,1636** và **16,4544** mức xám. Nét mảnh là ca Keys cho MAE thấp hơn | [01 · So sánh ảnh nét mảnh](du_phong_demo/01-net-manh-4x.png) |
| 25 giây | Trong phần giải hệ 1D, chọn **hàng biên**, \(\delta=0{,}1\) | Ngưỡng **1,6**. Dừng sau **5 vòng**, sai lệch đo được **0,0130**, dưới chặn **0,0407** | [02 · Dừng theo sai lệch 1D](du_phong_demo/02-dung-1d-nguong-01.png) |
| 35 giây | Trong phần toàn ảnh 2D, chọn **hoa văn**, \(\delta=0{,}1\) | Ngưỡng chung xấp xỉ **0,4571**. Tối đa **8/7 vòng** theo hàng/cột. Sai lệch cực đại **0,0118** và chặn **0,0992** mức xám trước làm tròn | [03 · Dừng theo sai lệch 2D](du_phong_demo/03-dung-2d-nguong-01.png) |

Khi trình chiếu bản đồ sai lệch, giải thích rằng demo đặt thang màu theo cực đại của cảnh hiện tại. Dùng [bản đồ cùng thang màu trong báo cáo](results/day14/ban-do-sai-lech-2d.png) nếu cần so độ lớn giữa các \(\delta\).

## Câu hỏi bảo vệ

**1. Bicubic Keys và spline đều dùng bậc ba. Khác nhau ở đâu?**  
Keys lấy trọng số từ một hàm nhân cố định với bốn mẫu theo mỗi trục. Spline tự nhiên tìm các đạo hàm cấp hai qua một hệ chung cho cả dãy, rồi dùng chúng để nối các đoạn đa thức với đạo hàm đến cấp hai liên tục.

**2. Vì sao đặt đạo hàm cấp hai ở hai đầu bằng 0?**  
Các điều kiện ghép tại nút bên trong cần thêm hai điều kiện biên để xác định spline. Chọn biên tự nhiên nghĩa là đặt độ cong bằng 0 ở hai đầu. Đây là giả thiết của mô hình và có thể ảnh hưởng đến vùng sát mép.

**3. Hệ số \(1/16\) đến từ đâu?**  
Viết \(r=Ae\). Tại thành phần sai số lớn nhất, hệ số đường chéo \(4\) trừ tối đa hai đóng góp ngoài đường chéo \(1+1\), nên \(\|e\|_\infty\le\|r\|_\infty/2\). Hiệu hai spline cùng dữ liệu chỉ còn phần đạo hàm cấp hai. Tổng trị tuyệt đối của hai trọng số tương ứng bằng \(t(1-t)/2\le1/8\). Nhân hai hệ số được \(1/16\).

**4. Vì sao 2D dùng \(16\delta/3{,}5\)?**  
Lượt dọc sinh sai lệch tối đa \(R_y/16\). Sai lệch từ lượt ngang đi qua spline dọc chính xác với hệ số chặn \(2{,}5\), nên phần này tối đa \(2{,}5R_x/16\). Đặt cả hai phần dư dưới \(16\delta/(2{,}5+1)\) thì tổng chặn không vượt \(\delta\).

**5. Đã có Thomas thì vì sao dùng Gauss–Seidel?**  
Thomas giải trực tiếp hệ ba đường chéo với chi phí \(O(n)\) và làm mốc đối chiếu. Gauss–Seidel trả lời câu hỏi dừng theo độ chính xác đầu ra. Mỗi vòng quét có chi phí \(O(n)\), và bài này đánh giá số vòng cùng sai lệch, chưa đo thời gian để xếp hạng tốc độ.

**6. Sai lệch dưới 0,01 mức xám thì vì sao vẫn có pixel 8 bit khác?**  
Hai giá trị ở hai phía của cùng ngưỡng nửa nguyên có thể làm tròn ra hai số nguyên liên tiếp. Ví dụ \(100{,}499\) và \(100{,}501\) chỉ chênh \(0{,}002\), nhưng làm tròn thành \(100\) và \(101\).

**7. Spline thắng về MAE ở 6/10 cặp thì có nên dùng cho mọi ảnh?**  
Số \(6/10\) tóm tắt bộ thử cụ thể, gồm 5 ảnh, hai mức phóng, một quy tắc thu nhỏ và một điều kiện biên. Mặt cắt biên còn cho thấy spline có thể vượt dải cường độ. Đọc MAE cùng ảnh và mặt cắt để biết lỗi xuất hiện ở đâu.

**8. Phần 3D liên quan đến CT ở bước nào?**  
Sau khi đã có khối voxel, có thể nội suy để lấy mẫu trên một lưới hoặc mặt phẳng khác. Mô phỏng dùng các lát Gaussian cách nhau 3 mm, đánh giá tại các lát trung gian cách nhau 1 mm trên lưới tham chiếu. Kết quả định lượng thuộc về khối mô phỏng.

## Trước giờ trình bày

- Mở demo, ba ảnh dự phòng và bộ slide. Để sẵn cảnh nét mảnh \(4\times\) ở đầu demo.
- Tập một lượt có bấm giờ. Nếu vượt 8 phút, rút phần liệt kê phương pháp và giữ thời gian cho chứng minh, hai mốc so sánh và phần demo.
- Dùng cùng ba từ khóa trong câu trả lời và khi chỉ vào hình. **MAE** so với ảnh gốc. **Sai lệch bộ giải** so với Thomas trên cùng spline. **Chặn** tính từ phần dư trước làm tròn.
