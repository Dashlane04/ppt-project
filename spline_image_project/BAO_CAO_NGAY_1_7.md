# Phóng to ảnh số bằng spline bậc ba

Trong tuần đầu, nhóm xây dựng quy trình tạo dữ liệu, cài đặt các phương pháp nội suy và đối chiếu Thomas với Gauss–Seidel trên từng hàng pixel. Demo và chương trình thực nghiệm dùng chung phần tính toán. [Demo offline](demo.html) · [Chương trình thực nghiệm](run_experiments.mjs) · [Mã nội suy](src/interpolation.mjs)

## Ngày 1. Quy ước lấy mẫu và hai phương pháp cơ sở

1. **Tính tọa độ nguồn.** Với hệ số phóng $`s`$ và cột đầu ra $`u`$, tọa độ theo tâm pixel là $`x=(u+0{,}5)/s-0{,}5`$. Chiều dọc dùng cùng quy tắc. Mọi phương pháp giới hạn tọa độ truy vấn vào miền các tâm mẫu. Nếu cần đọc mẫu ngoài miền, chương trình dùng pixel ở mép gần nhất.
2. **Nội suy song tuyến tính.** Nếu $`x=i+t`$ với $`0\le t\le1`$, nội suy 1D cho $`(1-t)f_i+t f_{i+1}`$. Tính theo hàng rồi theo cột tương đương với lấy trung bình có trọng số của bốn pixel lân cận. Các trọng số không âm và có tổng bằng một.
3. **Bicubic Keys.** Đặt $`q=\lvert d\rvert`$ với $`d`$ là khoảng cách đến tâm mẫu. Trọng số là $`(a+2)q^3-(a+3)q^2+1`$ khi $`q\lt 1`$, là $`aq^3-5aq^2+8aq-4a`$ khi $`1\le q\lt 2`$ và bằng 0 ở ngoài. Giữ $`a=-0{,}5`$ trong mọi ca thử. Bốn mẫu trên mỗi trục tạo vùng lấy mẫu $`4\times4`$. Trọng số âm có thể làm mức xám vượt dải gần biên. [Bài báo của Keys](https://ncorr.com/download/publications/keysbicubic.pdf)
4. **Đo MAE.** Sau hai lượt nội suy, giới hạn mức xám về $`[0,255]`$ rồi làm tròn một lần. Với ảnh phóng đã lượng tử hóa $`\widehat I`$ và ảnh gốc $`I`$, MAE là $`\frac{1}{WH}\sum_{j,i}\lvert\widehat I[j,i]-I[j,i]\rvert`$, trong đó $`W`$ và $`H`$ là chiều rộng và chiều cao. Khi vẽ mặt cắt biên, giữ giá trị số thực để thấy cả phần dao động ngoài dải.

Một phép tính tay dùng khối $`2\times2`$ có hai hàng $`(0,40)`$ và $`(80,120)`$. Tại $`x=y=0{,}25`$, nội suy ngang cho 10 và 90. Nội suy dọc cho $`0{,}75\cdot10+0{,}25\cdot90=30`$, khớp với chương trình. Kiểm thử cũng xác nhận ảnh hằng giữ nguyên khi phóng và phép phóng $`1\times`$ khớp với mẫu gốc sau lượng tử hóa.

## Ngày 2. Dữ liệu và lý do chọn tham số

| Điều kiện cố định | Giá trị | Lý do |
|---|---|---|
| Kích thước tham chiếu | $`384\times224`$ pixel xám | Chia hết cho cả 2 và 4, đồng thời đủ nhỏ để chạy demo trực tiếp |
| Hệ số phóng | $`2\times`$ và $`4\times`$ | Hai mức làm thưa khác nhau. Đầu vào tương ứng là $`192\times112`$ và $`96\times56`$ |
| Tạo ảnh nhỏ | Trung bình các khối $`s\times s`$ không chồng lấn, lưu số thực | Cùng một quy trình giảm mẫu cho tất cả phương pháp. Giữ phần lẻ để loại biến số lượng tử hóa đầu vào |
| Hai ảnh chụp | `camera` của Lav Varshney và `astronaut` của NASA | Có đường biên và kết cấu tự nhiên. Lấy vùng tâm giống nhau theo quy tắc cố định |
| Ba ảnh tự tạo | Biên $`38/216`$, nét mảnh và hoa văn sin/cos | Tách khả năng giữ biên, giữ nét và tái tạo chi tiết tần số cao |

Viết chỉ số theo thứ tự hàng, cột. Mỗi pixel của ảnh nhỏ là $`D_s[j,i]=s^{-2}\sum_{a,b=0}^{s-1}I[sj+a,si+b]`$. Chẳng hạn, biên thẳng nằm tại $`x=190`$. Khi thu nhỏ theo hệ số 4, đoạn $`x=188,\ldots,191`$ có hai mẫu mức 38 và hai mẫu mức 216, nên mẫu trung bình có mức xám 127.

Ảnh nét mảnh gồm hai đường chéo, một vòng tròn và các vạch đứng. Ảnh hoa văn có thành phần sin với chu kỳ tăng từ $`4{,}5`$ đến gần $`16{,}5`$ pixel theo chiều dọc, cho phép quan sát cả vùng dao động nhanh lẫn vùng dao động chậm. Các ảnh tổng hợp được tạo bằng công thức cố định.

Ảnh chụp gốc $`512\times512`$ được cắt vùng tâm $`[64,448)\times[144,368)`$. Quy tắc xám hóa là làm tròn $`0{,}299R+0{,}587G+0{,}114B`$. [Thông tin ảnh Camera](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.camera) · [Thông tin ảnh Astronaut](https://scikit-image.org/docs/0.25.x/api/skimage.data.html#skimage.data.astronaut)

[Danh mục nguồn và SHA-256](data/manifest.json) lưu liên kết ảnh gốc, tọa độ cắt và mã kiểm tra. [Tệp số liệu](results/results.json) ghi kích thước, đường dẫn và SHA-256 cho cả 10 đầu vào đã thu nhỏ.

## Ngày 3–4. Hệ spline tự nhiên và thuật toán Thomas

Xét một hàng mẫu $`f_0,\ldots,f_{n-1}`$ với bước nút bằng 1. Gọi $`M_i=S''(i)`$ là đạo hàm cấp hai tại nút $`i`$. Trên đoạn $`[i,i+1]`$, đặt $`t=x-i`$ và $`u=1-t`$. Spline bậc ba có dạng

```math
S_i(x)=u f_i+t f_{i+1}+\frac{(u^3-u)M_i+(t^3-t)M_{i+1}}{6}.
```

Hai số hạng chứa $`M`$ bằng $`0`$ tại các đầu đoạn, nên spline đi qua các mẫu. Hai đoạn kề dùng chung $`M_i`$ tại nút nối, nên đạo hàm cấp hai khớp. Ép đạo hàm cấp một bên trái và bên phải bằng nhau cho hệ

```math
M_{i-1}+4M_i+M_{i+1}=6(f_{i+1}-2f_i+f_{i-1}),\qquad M_0=M_{n-1}=0.
```

Điều kiện tự nhiên đặt độ cong ở hai đầu bằng $`0`$ và xác định mô hình dùng xuyên suốt bài. Các ẩn bên trong cho một hệ ba đường chéo có đường chéo chính bằng $`4`$ và hai đường kề bằng $`1`$. [Bài giảng của University of Utah](https://web.physics.utah.edu/~detar/phys6720/handouts/cubic_spline/cubic_spline/node1.html)

**Thomas** khử lần lượt đường chéo dưới rồi thế lùi. Với chỉ số từ 1 cho hệ các ẩn bên trong, bắt đầu $`d_1=4`$, $`q_1=b_1`$, sau đó dùng

```math
d_i=4-\frac{1}{d_{i-1}},\qquad q_i=b_i-\frac{q_{i-1}}{d_{i-1}}.
```

Thế lùi theo $`M_i=(q_i-M_{i+1})/d_i`$, bắt đầu từ $`M_{n-1}=0`$. Vì mỗi bước khử chỉ dùng hàng ngay trước đó, tổng số phép toán tăng tuyến tính theo số ẩn. Với dãy $`(0,1,0,1)`$, hệ có vế phải $`(-12,12)`$ và nghiệm hai ẩn $`(-4,4)`$. Kiểm thử xác nhận bộ giải cho đúng nghiệm và spline khớp giá trị mẫu lẫn đạo hàm cấp một tại các nút nối. Trên ba hàng thử, nghiệm từ `numpy.linalg.solve` trên ma trận đầy đủ lệch Thomas tối đa $`5{,}685\times10^{-14}`$. [Kết quả đối chiếu độc lập](results/doi-chieu-doc-lap.json)

## Ngày 5. Dựng ảnh spline 2D

Với ảnh nhỏ $`96\times56`$ ở mức $`4\times`$, lượt ngang tạo ảnh trung gian $`384\times56`$ và lượt dọc tạo ảnh $`384\times224`$. Cả hai lượt dùng Thomas. Ảnh trung gian được lưu dưới dạng `Float64`, nên giá trị đưa vào lượt dọc vẫn giữ phần lẻ.

| Ảnh, mức phóng $`4\times`$ | Song tuyến tính | Bicubic Keys | Spline tự nhiên |
|---|---:|---:|---:|
| Biên tương phản | 0,8905 | 0,8434 | 0,8481 |
| Hoa văn | 31,5908 | 27,8425 | 25,8521 |

Trên hai mẫu này, bicubic Keys có MAE thấp hơn một chút ở ảnh biên, còn spline có MAE thấp hơn trên ảnh hoa văn. Quan sát [mặt cắt qua biên](results/mat-cat-bien.png) cho thấy hai phương pháp bậc ba đều vượt dải sáng $`[38,216]`$ quanh biên, dù MAE toàn ảnh gần nhau. [Bảng đủ 30 trường hợp](results/KET_QUA.md) lưu kết quả chạy ban đầu trên cả 5 ảnh và hai mức phóng.

## Ngày 6–7. Gauss–Seidel và kiểm tra hội tụ trên hàng

Gauss–Seidel giải cùng hệ mà Thomas dùng. Với nghiệm gần đúng $`\widetilde M^{(k)}`$ tại vòng $`k`$, mỗi bước quét theo chỉ số tăng dần dùng công thức

```math
\widetilde M_i^{(k+1)}
=\frac{b_i-\widetilde M_{i-1}^{(k+1)}-\widetilde M_{i+1}^{(k)}}{4}.
```

Ẩn bên trái vừa được cập nhật, còn ẩn bên phải giữ giá trị vòng trước. Hệ chéo trội nghiêm ngặt vì $`4\gt 1+1`$. Tính lại $`r=b-A\widetilde M`$ sau mỗi vòng, kể cả vòng $`0`$, để kiểm tra trực tiếp phương trình. [Mô tả phương pháp Gauss–Seidel của Netlib](https://www.netlib.org/linalg/old_html_templates/subsection2.6.2.2.html)

| Tham số | Giá trị và lý do |
|---|---|
| Dữ liệu hàng | Hàng 16 của ảnh biên nhỏ để lấy vùng biên thẳng, hàng 28 của ảnh hoa văn nhỏ để thử dãy dao động, và hàng hằng 128 để kiểm tra dừng ngay |
| Hệ thống | Mỗi hàng có 96 mẫu và 94 ẩn, cùng kích thước và cấu trúc ma trận. Thay nội dung hàng chỉ đổi vế phải |
| Khởi tạo | Toàn số $`0`$, tạo một mốc lặp thống nhất và dễ tính lại |
| Dừng | $`\lVert r\rVert_\infty\le10^{-8}`$, tuyệt đối. Ngưỡng này dùng để đối chiếu hai bộ giải ở độ chính xác cao trong giai đoạn đầu. Chuẩn vô cùng đo độ lệch lớn nhất của một phương trình và dùng được cả khi $`b=0`$ |
| Giới hạn | Tối đa 500 vòng để phát hiện ca chưa đạt ngưỡng. Hai hàng có biến thiên cần lần lượt 21 và 22 vòng. |

| Hàng | Số vòng | Phần dư cuối | Sai lệch mức xám lớn nhất đo trên lưới phóng 1D |
|---|---:|---:|---:|
| Biên thẳng | 21 | $`3{,}287\times10^{-9}`$ | $`4{,}281\times10^{-11}`$ |
| Hoa văn | 22 | $`3{,}028\times10^{-9}`$ | $`6{,}585\times10^{-11}`$ |
| Hằng 128 | 0 | 0 | 0 |

Cột cuối đo sai lệch giữa Gauss–Seidel và Thomas tại 384 điểm đầu ra trước lượng tử hóa. MAE ở phần so sánh ảnh dùng ảnh gốc làm mốc. Báo cáo chính mở rộng phép thử sang nhiều dung sai, lưới dày và toàn ảnh 2D. [Đồ thị phần dư](results/hoi-tu-gauss-seidel.png) · [Số liệu từng vòng](results/results.json) · [Báo cáo chính](BAO_CAO_NGAY_14.md)

## Chạy lại

Chạy các lệnh sau trong thư mục `spline_image_project` để tái lập kết quả của tuần đầu. Phần tính toán dùng Node.js. Python dùng NumPy và Pillow để chuẩn bị ảnh, cùng Matplotlib để xuất hình. Demo đóng gói sẵn có thể mở trực tiếp trong trình duyệt. [Demo offline](demo.html) · [Quy trình dựng lại toàn bộ demo](../README.md#chạy-lại-thí-nghiệm)

```text
python prepare_data.py
node --test verify.mjs
node run_experiments.mjs
python generate_figures.py
```

[Bảng kết quả](results/KET_QUA.md) · [Cấu hình và số liệu gốc](results/results.json) · [Hình so sánh 4×](results/so-sanh-anh-4x.png)
