# Phóng to ảnh số bằng spline bậc ba

Báo cáo triển khai ngày 1–7. Mốc này gồm quy trình tạo dữ liệu, hai phương pháp cơ sở, spline tự nhiên dùng Thomas và phép đối chiếu với Gauss–Seidel trên một hàng pixel. Cả [demo offline](demo.html) và [chương trình chạy thí nghiệm](run_experiments.mjs) dùng chung [mã nội suy](src/interpolation.mjs).

## Ngày 1. Quy ước lấy mẫu và hai phương pháp cơ sở

1. **Tính tọa độ nguồn.** Với hệ số phóng $s$ và chỉ số pixel đầu ra $u$, dùng $x=(u+0.5)/s-0.5$. Công thức này căn theo tâm pixel. Tọa độ theo chiều dọc được tính tương tự. Chặn tọa độ về miền các tâm mẫu. Với các hàm trọng số cần mẫu bên ngoài, lặp giá trị pixel ở mép. So với bản demo cũ, phiên bản này chặn cả tọa độ truy vấn để spline và các phương pháp đối chứng dùng cùng miền đánh giá.
2. **Nội suy song tuyến tính.** Trên một chiều, nếu $x=i+t$ với $0\le t\le1$, tính $(1-t)f_i+t f_{i+1}$. Thực hiện theo hàng rồi theo cột, tương đương dùng bốn pixel lân cận trong 2D. Trọng số không âm và có tổng bằng một. Đây là mốc cơ sở để thấy tác động của vùng lấy mẫu rộng hơn.
3. **Bicubic Keys.** Với khoảng cách $d$, đặt $q=|d|$. Trọng số là $(a+2)q^3-(a+3)q^2+1$ khi $q<1$, là $aq^3-5aq^2+8aq-4a$ khi $1\le q<2$ và bằng $0$ ở ngoài. Chọn $a=-0.5$ cố định để phép so sánh chỉ thay phương pháp. Bốn trọng số 1D theo mỗi chiều tạo vùng lấy mẫu $4\times4$. Trọng số âm có thể làm giá trị vượt khỏi dải sáng gần biên. [Bài báo của Keys](https://ncorr.com/download/publications/keysbicubic.pdf)
4. **Đo MAE.** Sau hai lượt nội suy, chặn về $[0,255]$ và làm tròn một lần. Tính $\mathrm{MAE}=\frac1{WH}\sum_{i,j}|\widehat I_{ij}-I_{ij}|$ với ảnh tham chiếu cùng kích thước. Đại lượng này có đơn vị mức xám và đo trên ảnh cuối cùng mà người xem thấy. Mặt cắt biên dùng giá trị số thực trước chặn và làm tròn để quan sát được dao động.

Kiểm tra bằng khối $2\times2$ có các hàng $(0,40)$ và $(80,120)$. Ở tọa độ nguồn $(0.25,0.25)$, hai giá trị nội suy ngang là $10$ và $90$. Nội suy dọc cho $0.75\cdot10+0.25\cdot90=30$. Chương trình cho đúng $30$ tại pixel tương ứng. Ảnh hằng được giữ nguyên sau khi phóng, và mức phóng $1\times$ giữ nguyên các mẫu sau khi lượng tử hóa.

## Ngày 2. Dữ liệu và lý do chọn tham số

| Điều kiện cố định | Giá trị | Lý do |
|---|---|---|
| Kích thước tham chiếu | $384\times224$ pixel xám | Chia hết cho cả 2 và 4, đồng thời đủ nhỏ để chạy demo trực tiếp |
| Hệ số phóng | $2\times$ và $4\times$ | Hai mức làm thưa khác nhau. Đầu vào tương ứng là $192\times112$ và $96\times56$ |
| Tạo ảnh nhỏ | Trung bình các khối $s\times s$ không chồng lấn, lưu số thực | Cùng một quy trình giảm mẫu cho tất cả phương pháp. Giữ phần lẻ để loại biến số lượng tử hóa đầu vào |
| Hai ảnh chụp | `camera` của Lav Varshney và `astronaut` của NASA | Có đường biên và kết cấu tự nhiên. Lấy vùng tâm giống nhau theo quy tắc cố định |
| Ba ảnh tự tạo | Biên $38/216$, nét mảnh và hoa văn sin/cos | Tách khả năng giữ biên, giữ nét và tái tạo chi tiết tần số cao |

Mỗi mẫu nhỏ là $D_s[i,j]=s^{-2}\sum_{a,b=0}^{s-1}I[si+a,sj+b]$. Chẳng hạn, ở hàng biên mức $4\times$, khối ngang $x=188\ldots191$ chứa hai mẫu mức 38 và hai mẫu mức 216, nên cho $127$. Biên thẳng đặt tại $x=190$ để có một khối chứa cả hai mức sáng ở phép thu nhỏ $4\times$.

Ảnh nét mảnh dùng hai đường chéo, một vòng tròn và các vạch đứng. Ảnh hoa văn dùng thành phần sin có chu kỳ tăng từ $4.5$ đến gần $16.5$ pixel theo chiều dọc. Nhờ đó, vùng có chi tiết gần hoặc nhỏ hơn khoảng cách mẫu có thể được nhìn cạnh vùng ít chi tiết hơn. Các ảnh tự tạo có công thức cố định và không dùng số ngẫu nhiên.

Ảnh chụp gốc $512\times512$ được cắt vùng tâm $[64,448)\times[144,368)$. Quy tắc xám hóa là làm tròn $0.299R+0.587G+0.114B$. [Thông tin ảnh Camera](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.camera) · [Thông tin ảnh Astronaut](https://scikit-image.org/docs/0.25.x/api/skimage.data.html#skimage.data.astronaut)

[Danh mục nguồn và SHA-256](data/manifest.json) lưu liên kết ảnh gốc, tọa độ cắt và mã kiểm tra. [Tệp số liệu](results/results.json) ghi kích thước, đường dẫn và SHA-256 cho cả 10 đầu vào đã thu nhỏ.

## Ngày 3–4. Hệ spline tự nhiên và thuật toán Thomas

Trên một hàng $f_0,\ldots,f_{n-1}$, lấy khoảng cách giữa hai tâm mẫu liên tiếp bằng $1$. Đặt $M_i=S''(i)$. Trên đoạn $[i,i+1]$, đặt $t=x-i$ và $u=1-t$, ta dùng

$$
S_i(x)=u f_i+t f_{i+1}+\frac{(u^3-u)M_i+(t^3-t)M_{i+1}}{6}.
$$

Hai số hạng chứa $M$ bằng $0$ tại các đầu đoạn, nên spline đi qua các mẫu. Hai đoạn kề dùng chung $M_i$ tại nút nối, nên đạo hàm cấp hai khớp. Ép đạo hàm cấp một bên trái và bên phải bằng nhau cho hệ

$$
M_{i-1}+4M_i+M_{i+1}=6(f_{i+1}-2f_i+f_{i-1}),\qquad M_0=M_{n-1}=0.
$$

Điều kiện tự nhiên đặt độ cong ở hai đầu bằng $0$ và xác định mô hình dùng xuyên suốt bài. Các ẩn bên trong cho một hệ ba đường chéo có đường chéo chính bằng $4$ và hai đường kề bằng $1$. [Bài giảng của University of Utah](https://web.physics.utah.edu/~detar/phys6720/handouts/cubic_spline/cubic_spline/node1.html)

**Thomas** khử lần lượt đường chéo dưới rồi thế lùi. Với chỉ số từ 1 cho hệ các ẩn bên trong, bắt đầu $d_1=4$, $q_1=b_1$, sau đó dùng

$$
d_i=4-\frac{1}{d_{i-1}},\qquad q_i=b_i-\frac{q_{i-1}}{d_{i-1}}.
$$

Giải từ cuối bằng $M_i=(q_i-M_{i+1})/d_i$, dùng $M_{n-1}=0$ ở ngoài hệ. Mỗi hàng khử chỉ liên quan một hàng liền trước, nên số phép toán tăng tuyến tính theo số ẩn. Với dãy $(0,1,0,1)$, hệ có vế phải $(-12,12)$ và nghiệm hai ẩn $(-4,4)$. Mã cho đúng kết quả này, đi qua các nút và cho đạo hàm cấp một khớp tại các điểm nối. Phép đối chiếu độc lập dùng ma trận đầy đủ và `numpy.linalg.solve` cho sai khác lớn nhất với Thomas là $5.685\times10^{-14}$ trên ba hàng thử. [Kết quả đối chiếu độc lập](results/doi-chieu-doc-lap.json)

## Ngày 5. Dựng ảnh spline 2D

Với ảnh nhỏ $96\times56$ ở mức $4\times$, nội suy từng hàng để thu được ảnh trung gian $384\times56$. Sau đó nội suy từng cột để thu được ảnh $384\times224$. Cả hai lượt dùng Thomas. Giữ Float64 qua lượt ngang để phép làm tròn trung gian không ảnh hưởng đến lượt dọc.

| Ảnh, mức phóng $4\times$ | Song tuyến tính | Bicubic Keys | Spline tự nhiên |
|---|---:|---:|---:|
| Biên tương phản | 0,8905 | 0,8434 | 0,8481 |
| Hoa văn | 31,5908 | 27,8425 | 25,8521 |

Trên hai mẫu này, bicubic Keys có MAE thấp hơn một chút ở ảnh biên, còn spline có MAE thấp hơn trên ảnh hoa văn. Quan sát [mặt cắt qua biên](results/mat-cat-bien.png) cho thấy hai phương pháp bậc ba đều vượt dải sáng $[38,216]$ quanh biên, dù MAE toàn ảnh gần nhau. [Bảng đủ 30 trường hợp](results/KET_QUA.md) lưu kết quả chạy ban đầu trên cả 5 ảnh và hai mức phóng.

## Ngày 6–7. Gauss–Seidel và kiểm tra hội tụ trên hàng

Gauss–Seidel giải cùng hệ của Thomas. Trong mỗi vòng quét từ trái sang phải, cập nhật

$$
M_i^{(k+1)}=\frac{b_i-M_{i-1}^{(k+1)}-M_{i+1}^{(k)}}4.
$$

Ẩn bên trái vừa được cập nhật, còn ẩn bên phải giữ giá trị vòng trước. Hệ chéo trội nghiêm ngặt vì $4>1+1$. Tính lại $r=b-A\widetilde M$ sau mỗi vòng, kể cả vòng $0$, để kiểm tra trực tiếp phương trình. [Mô tả phương pháp Gauss–Seidel của Netlib](https://www.netlib.org/linalg/old_html_templates/subsection2.6.2.2.html)

| Tham số | Giá trị và lý do |
|---|---|
| Dữ liệu hàng | Hàng 16 của ảnh biên nhỏ để lấy vùng biên thẳng, hàng 28 của ảnh hoa văn nhỏ để thử dãy dao động, và hàng hằng 128 để kiểm tra dừng ngay |
| Hệ thống | Mỗi hàng có 96 mẫu và 94 ẩn, cùng kích thước và cấu trúc ma trận. Thay nội dung hàng chỉ đổi vế phải |
| Khởi tạo | Toàn số $0$, tạo một mốc lặp thống nhất và dễ tính lại |
| Dừng | $\|r\|_\infty\le10^{-8}$, tuyệt đối. Ngưỡng này dùng để đối chiếu hai bộ giải ở độ chính xác cao trong giai đoạn đầu. Chuẩn vô cùng đo độ lệch lớn nhất của một phương trình và dùng được cả khi $b=0$ |
| Giới hạn | 500 vòng, để phát hiện lỗi hội tụ. Hai hàng không hằng thực tế cần 21–22 vòng |

| Hàng | Số vòng | Phần dư cuối | Sai lệch mức xám lớn nhất đo trên lưới phóng 1D |
|---|---:|---:|---:|
| Biên thẳng | 21 | $3.287\times10^{-9}$ | $4.281\times10^{-11}$ |
| Hoa văn | 22 | $3.028\times10^{-9}$ | $6.585\times10^{-11}$ |
| Hằng 128 | 0 | 0 | 0 |

Sai lệch ở cột cuối so với spline dùng Thomas, tính trên 384 điểm đầu ra trước khi lượng tử hóa. Đây là phép đo **sai lệch do bộ giải**. MAE ở ngày 5 dùng **ảnh gốc** làm tham chiếu để đo chất lượng phóng ảnh. [Đồ thị phần dư](results/hoi-tu-gauss-seidel.png) và [số liệu từng vòng](results/results.json) cho phép kiểm tra lại kết quả. Khảo sát nhiều dung sai, kiểm chứng chặn sai số trên lưới dày và chạy Gauss–Seidel trên toàn ảnh 2D thuộc các mốc sau ngày 7.

## Chạy lại

Mở [demo.html](demo.html) trực tiếp trong trình duyệt. Demo đã chứa dữ liệu và đồ thị, có thể chạy offline. Để tính lại từ các ảnh gốc đã lưu, chạy các lệnh dưới đây trong thư mục dự án. Phần tính toán dùng Node.js. Python cần NumPy và Pillow để chuẩn bị ảnh, cùng Matplotlib để xuất hình.

```text
python prepare_data.py
node --test verify.mjs
node run_experiments.mjs
python generate_figures.py
node build_demo.mjs
```

[Bảng kết quả](results/KET_QUA.md) · [Cấu hình và số liệu gốc](results/results.json) · [Hình so sánh 4×](results/so-sanh-anh-4x.png)
