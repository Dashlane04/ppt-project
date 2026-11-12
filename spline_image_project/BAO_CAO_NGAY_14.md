# Phóng to ảnh số bằng nội suy và kiểm soát sai số khi giải hệ spline

Bài thực nghiệm so sánh **nội suy song tuyến tính, bicubic Keys và spline bậc ba tự nhiên** khi phóng ảnh lên gấp 2 và 4 lần. Riêng với spline, bài toán giải hệ đặt ra câu hỏi **nên dừng Gauss–Seidel ở phần dư bao nhiêu để ảnh thu được lệch tối đa $`\delta`$ mức xám so với ảnh tính bằng Thomas?**

[Demo offline](demo.html) cho phép đổi phương pháp, mức phóng và sai lệch cho phép $`\delta`$ trên một hàng hoặc toàn ảnh. Các phép tính tay và đối chiếu với bộ giải độc lập nằm trong [nhật ký ngày 1–7](BAO_CAO_NGAY_1_7.md). Cấu hình thí nghiệm và số liệu từng vòng lặp nằm trong [tệp kết quả ngày 14](results/day14/KET_QUA_NGAY_14.json).

Trên 10 cặp ảnh và mức phóng, bicubic Keys có sai số tuyệt đối trung bình (MAE) thấp nhất ở 4 cặp, còn spline tự nhiên dẫn đầu ở 6 cặp. Với ảnh hoa văn phóng $`4\times`$ và mục tiêu $`\delta=0{,}1`$, sai lệch cực đại giữa Gauss–Seidel và Thomas là $`0{,}011788`$ mức xám, dưới chặn $`0{,}099184`$ tính từ phần dư.

## Thiết kế thí nghiệm

| Thành phần | Điều kiện | Lý do chọn |
|---|---|---|
| Ảnh tham chiếu | 5 ảnh xám $`384\times224`$. Ba ảnh tổng hợp có biên, nét mảnh và hoa văn. Hai ảnh chụp là Camera và Astronaut. | Ảnh tổng hợp giúp quan sát từng loại cấu trúc, còn ảnh chụp bổ sung kết cấu tự nhiên. Cả hai chiều đều chia hết cho 2 và 4. |
| Tạo ảnh đầu vào | Lấy trung bình các khối $`s\times s`$ không chồng lấn với $`s\in\{2,4\}`$. Lưu bằng `Float64`. | Các phương pháp dùng chung ảnh nhỏ ở mỗi mức phóng. Kiểu số thực giữ lại phần lẻ của trung bình khối. |
| Tọa độ và mép ảnh | Căn theo tâm pixel và giới hạn tọa độ truy vấn vào miền mẫu. Khi cần đọc một mẫu ngoài miền, dùng giá trị tại mép gần nhất. | Các phương pháp đánh giá tại cùng tọa độ và spline chỉ được tính trong miền nội suy. |
| Spline tự nhiên | Chuẩn hóa bước nút thành $`h=1`$ và đặt $`S''=0`$ ở hai đầu dãy. | Ma trận ba đường chéo có hệ số cố định, nhờ đó có thể suy ra chặn sai số cụ thể. |
| Gauss–Seidel | Khởi tạo bằng vectơ không, quét theo chỉ số tăng dần và giới hạn 500 vòng cho mỗi hệ. | Dùng cùng cách khởi tạo cho mọi ca thử. Giới hạn vòng giúp phát hiện hệ chưa đạt ngưỡng. |
| Sai lệch cho phép $`\delta`$ | Chọn 1, 0,1 và 0,01 mức xám trước khi làm tròn. | Mỗi mức siết ngưỡng thêm 10 lần để quan sát số vòng cần thiết. |

*Bảng 1. Điều kiện dùng chung trong thí nghiệm phóng ảnh.*

Từ mỗi ảnh chụp $`512\times512`$, nhóm cắt vùng giữa ảnh $`[64,448)\times[144,368)`$ theo thứ tự ngang, dọc. Mức xám được tính bằng cách làm tròn $`0{,}299R+0{,}587G+0{,}114B`$. Tọa độ cắt, nguồn ảnh và mã kiểm tra được lưu cùng dữ liệu. [Danh mục dữ liệu và mã SHA-256](data/manifest.json) · [Camera, Lav Varshney](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.camera) · [Astronaut, NASA](https://scikit-image.org/docs/0.25.x/api/skimage.data.html#skimage.data.astronaut)

## Công thức dùng trong quy trình phóng ảnh

### Tạo đầu vào và ánh xạ tọa độ

Gọi $`I`$ là ảnh tham chiếu và $`D_s`$ là ảnh thu nhỏ với hệ số $`s`$. Các chỉ số trong ngoặc vuông luôn viết theo thứ tự hàng, cột. Mỗi pixel của $`D_s`$ là trung bình của một khối trên $`I`$.

```math
D_s[j,i]=\frac{1}{s^2}\sum_{a=0}^{s-1}\sum_{b=0}^{s-1} I[sj+a,si+b].
```

Với pixel đầu ra ở cột $`u`$ và hàng $`v`$, tọa độ tương ứng trên ảnh nhỏ được tính theo tâm pixel.

```math
x=\frac{u+0{,}5}{s}-0{,}5,\qquad y=\frac{v+0{,}5}{s}-0{,}5.
```

Sau khi giới hạn tọa độ vào miền mẫu, chương trình nội suy theo hàng rồi theo cột. Chẳng hạn, khi phóng $`4\times`$, ảnh nhỏ $`96\times56`$ thành $`384\times56`$ sau lượt ngang và $`384\times224`$ sau lượt dọc.

### Song tuyến tính và bicubic Keys

Trên đoạn giữa hai mẫu $`f_i`$ và $`f_{i+1}`$, đặt $`x=i+t`$ với $`0\le t\le1`$. Nội suy tuyến tính cho $`L(x)=(1-t)f_i+t f_{i+1}`$. Áp dụng theo cả hai trục, một điểm trong miền được tính từ trung bình có trọng số của bốn mẫu lân cận.

Bicubic dùng bốn mẫu theo mỗi chiều với hàm trọng số Keys. Đặt $`q=\lvert d\rvert`$, trong đó $`d`$ là khoảng cách tới tâm mẫu.

```math
K(d)=
\begin{cases}
(a+2)q^3-(a+3)q^2+1,&0\le q<1,\\
aq^3-5aq^2+8aq-4a,&1\le q<2,\\
0,&q\ge2.
\end{cases}
\qquad a=-0{,}5.
```

Giá trị 1D là tổng $`\sum_i w_i f_i`$ trên bốn chỉ số lân cận, với $`w_i=K(x-i)/\sum_j K(x-j)`$ và mẫu số lấy trên cùng bốn chỉ số. Nếu một chỉ số nằm ngoài ảnh, chương trình đọc giá trị tại mép gần nhất và giữ nguyên khoảng cách dùng để tính trọng số. Trong 2D, tích trọng số theo hai trục tạo vùng lấy mẫu $`4\times4`$. [Bài báo gốc của Keys](https://ncorr.com/download/publications/keysbicubic.pdf)

Demo bổ sung láng giềng gần nhất, Lanczos‑3 và PCHIP. Láng giềng gần nhất chọn mẫu có chỉ số $`\lfloor x+0{,}5\rfloor`$. Lanczos‑3 chuẩn hóa trọng số $`K_{\mathrm{L}}(d)=\operatorname{sinc}(d)\operatorname{sinc}(d/3)`$ trong miền $`\lvert d\rvert\lt 3`$, với trọng số bằng 0 ở ngoài miền. Ở đây, $`\operatorname{sinc}(d)=\sin(\pi d)/(\pi d)`$ khi $`d\ne0`$ và $`\operatorname{sinc}(0)=1`$. [Getreuer, *Linear Methods for Image Interpolation*](https://www.ipol.im/pub/art/2011/g_lmii/) · [Phần thử nghiệm PCHIP](BAO_CAO_NANG_CAO.md)

### Dựng spline và giải hệ

Trên đoạn $`[i,i+1]`$, đặt $`t=x-i`$, $`u=1-t`$ và $`M_i=S''(i)`$. Vì $`S_i`$ có bậc ba, đạo hàm cấp hai biến thiên tuyến tính theo $`S_i''(x)=uM_i+tM_{i+1}`$. Tích phân hai lần rồi yêu cầu đường cong đi qua hai mẫu $`f_i`$ và $`f_{i+1}`$ cho công thức (1).

```math
S_i(x)=uf_i+tf_{i+1}
+\frac{(u^3-u)M_i+(t^3-t)M_{i+1}}{6}.
\tag{1}
```

Ở nút $`i`$, đạo hàm từ đoạn trái là $`f_i-f_{i-1}+(M_{i-1}+2M_i)/6`$, còn đạo hàm từ đoạn phải là $`f_{i+1}-f_i-(2M_i+M_{i+1})/6`$. Cho hai đạo hàm bằng nhau tại mỗi nút trong và áp điều kiện biên tự nhiên, ta được hệ (2).

```math
\begin{aligned}
M_{i-1}+4M_i+M_{i+1}
  &=6(f_{i+1}-2f_i+f_{i-1}), && 1\le i\le n-2,\\
M_0&=M_{n-1}=0.
\end{aligned}
\tag{2}
```

Gọi $`AM=b`$ là hệ của $`n-2`$ ẩn bên trong, với $`A=\operatorname{tridiag}(1,4,1)`$ và $`b_i`$ là vế phải của (2). Thomas khử lần lượt đường chéo dưới rồi thế lùi. Bắt đầu từ $`d_1=4`$ và $`q_1=b_1`$, tính các hệ số theo thứ tự tăng của $`i`$, sau đó tính $`M_i`$ theo thứ tự giảm, bắt đầu từ điều kiện $`M_{n-1}=0`$.

```math
\begin{aligned}
d_i &= 4-\frac{1}{d_{i-1}}, && 2\le i\le n-2,\\
q_i &= b_i-\frac{q_{i-1}}{d_{i-1}}, && 2\le i\le n-2,\\
M_i &= \frac{q_i-M_{i+1}}{d_i}, && i=n-2,\ldots,1.
\end{aligned}
```

Gauss–Seidel giải cùng hệ bằng phép lặp. Khi quét từ đầu dãy, công thức dùng giá trị vừa tính ở bên trái và giá trị vòng trước ở bên phải.

```math
\widetilde M_i^{(k+1)}
=\frac{b_i-\widetilde M_{i-1}^{(k+1)}-\widetilde M_{i+1}^{(k)}}{4},\qquad
R^{(k)}=\lVert b-A\widetilde M^{(k)}\rVert_\infty.
```

Chương trình tính phần dư từ hệ ban đầu sau mỗi vòng, kể cả ở nghiệm khởi tạo. Chuẩn vô cùng lấy độ lệch lớn nhất giữa các phương trình và vẫn xác định khi $`b=0`$. [Dẫn xuất spline](https://web.physics.utah.edu/~detar/phys6720/handouts/cubic_spline/cubic_spline/node1.html) · [Gauss–Seidel, Netlib](https://www.netlib.org/linalg/old_html_templates/subsection2.6.2.2.html)

Để kiểm tra hội tụ, đặt $`e^{(k)}=M-\widetilde M^{(k)}`$ và $`E_k=\lVert e^{(k)}\rVert_\infty`$. Trừ công thức lặp khỏi phương trình của nghiệm đúng, ta được

```math
\lvert e_i^{(k+1)}\rvert
\le \frac{\lvert e_{i-1}^{(k+1)}\rvert+\lvert e_{i+1}^{(k)}\rvert}{4}.
```

Sai số ở nút biên trái bằng 0. Nếu thành phần vừa cập nhật bên trái không vượt $`E_k/3`$, vế phải của bất đẳng thức cũng không vượt $`(E_k/3+E_k)/4=E_k/3`$. Quy nạp theo $`i`$ cho $`E_{k+1}\le E_k/3`$, nên phép lặp hội tụ trong số học chính xác.

## Ngày 8–9. Chứng minh và kiểm chứng 1D

Gọi $`M`$ là nghiệm chính xác của (2) và $`\widetilde M`$ là nghiệm gần đúng. Sai số hệ số $`e=M-\widetilde M`$ liên hệ với phần dư qua $`r=b-A\widetilde M=Ae`$. Chọn chỉ số $`j`$ tại đó $`\lvert e_j\rvert=\lVert e\rVert_\infty`$. Với sai số ở hai đầu bằng 0, bất đẳng thức tam giác cho

```math
\lVert r\rVert_\infty \ge \lvert r_j\rvert
\ge 4\lvert e_j\rvert-\lvert e_{j-1}\rvert-\lvert e_{j+1}\rvert
\ge 2\lVert e\rVert_\infty.
```

Chặn này cũng cho thấy $`A`$ khả nghịch vì $`Ae=0`$ kéo theo $`e=0`$. Khi lấy hiệu hai spline trên cùng dữ liệu $`f`$, các số hạng tuyến tính trong (1) triệt tiêu. Vì $`u,t\in[0,1]`$ và $`u+t=1`$, ta có

```math
\lvert \widetilde S(x)-S(x)\rvert
\le\frac{(u-u^3)+(t-t^3)}{6}\lVert e\rVert_\infty
=\frac{t(1-t)}2\lVert e\rVert_\infty
\le \frac{1}{8}\lVert e\rVert_\infty.
```

Suy ra **trên cả đoạn liên tục**, $`\lVert \widetilde S-S\rVert_\infty\le \lVert r\rVert_\infty/16`$. Vì vậy, để sai lệch mức xám do bộ giải không quá $`\delta`$ trên một lượt 1D, dùng ngưỡng tuyệt đối $`\lVert r\rVert_\infty\le16\delta`$.

Mỗi hàng có 96 mẫu ở mức $`4\times`$. Nhóm chọn hàng 16 của ảnh biên nhỏ và hàng 28 của ảnh hoa văn nhỏ để thử lần lượt một biên thẳng và một vùng nhiều dao động. Chia mỗi khoảng giữa hai mẫu thành 64 đoạn rồi gộp các đầu mút chung, ta có $`95\cdot64+1=6\,081`$ vị trí đo. Chương trình ghi sai lệch lớn nhất so với Thomas sau mỗi vòng cho đến khi phần dư đạt $`10^{-8}`$. Với mỗi $`\delta`$, bảng lấy **vòng đầu tiên** có $`R\le16\delta`$. Sai lệch được đo trước khi giới hạn mức xám và làm tròn.

| Hàng | $`\delta`$ | Ngưỡng $`16\delta`$ | Vòng dừng | Sai lệch đo được | Chặn tại lúc dừng |
|---|---:|---:|---:|---:|---:|
| Biên thẳng | 1 | 16 | 3 | 0,201631 | 0,521484 |
| Biên thẳng | 0,1 | 1,6 | 5 | 0,013005 | 0,040741 |
| Biên thẳng | 0,01 | 0,16 | 7 | 0,000888 | 0,003565 |
| Hoa văn | 1 | 16 | 4 | 0,164346 | 0,551098 |
| Hoa văn | 0,1 | 1,6 | 6 | 0,016387 | 0,051257 |
| Hoa văn | 0,01 | 0,16 | 8 | 0,001290 | 0,004319 |

*Bảng 2. Số vòng dừng, sai lệch đo trên lưới dày và chặn từ phần dư. Hai cột cuối dùng đơn vị mức xám.*

![Sai lệch spline 1D và chặn phần dư theo số vòng](results/day14/kiem-chung-chan-1d.png)

*Hình 1. Sai lệch đo được và chặn của từng vòng lặp, trước lượng tử hóa.*

Tất cả sai lệch đo được đều thỏa chặn khi đối chiếu với dung sai số học $`2\times10^{-12}`$ cho `Float64`. Để đạt mốc phần dư $`10^{-8}`$, hàng biên cần 21 vòng và hàng hoa văn cần 22 vòng. Các ngưỡng suy từ $`\delta`$ trong bảng đều dừng sớm hơn.

## Ngày 10. Chặn sai lệch và thí nghiệm trên toàn ảnh

Gọi $`X`$ và $`Y`$ là hai phép spline chính xác theo hàng và cột, còn $`\widetilde X`$ và $`\widetilde Y`$ là hai lượt tính bằng Gauss–Seidel. Lấy $`R_x`$ và $`R_y`$ lần lượt là phần dư lớn nhất trong các hệ ở lượt ngang và lượt dọc. Nếu $`F=D_s`$ là ảnh nhỏ, đầu vào thực tế của lượt dọc là $`\widetilde X F`$.

Để biết sai lệch ngang có thể tăng bao nhiêu khi đi qua lượt dọc, xét phép spline chính xác $`T`$ trên một dãy $`f`$. Từ (2), $`\lVert b\rVert_\infty\le24\lVert f\rVert_\infty`$. Tính chéo trội cho $`\lVert M\rVert_\infty\le12\lVert f\rVert_\infty`$. Trong (1), phần tuyến tính có chuẩn tối đa $`\lVert f\rVert_\infty`$ và phần hiệu chỉnh có chuẩn tối đa $`\lVert M\rVert_\infty/8`$. Cộng hai chặn cho $`\lVert Tf\rVert_\infty\le 2{,}5\lVert f\rVert_\infty`$. Áp dụng kết quả này cho từng cột cho chặn tương ứng của $`Y`$.

Tách sai lệch 2D thành phần do lượt dọc và phần do lượt ngang truyền qua $`Y`$.

```math
\begin{aligned}
\widetilde Y(\widetilde X F)-Y(XF)
  &=\bigl[\widetilde Y(\widetilde X F)-Y(\widetilde X F)\bigr]
    +Y(\widetilde X F-XF),\\
\lVert\widetilde Y(\widetilde X F)-Y(XF)\rVert_\infty
  &\le\frac{2{,}5R_x+R_y}{16}.
\end{aligned}
```

Số hạng thứ nhất dùng chặn 1D trên cùng đầu vào của lượt dọc. Số hạng thứ hai dùng tính tuyến tính và chặn chuẩn của phép spline chính xác $`Y`$. Với ngưỡng chung $`\tau=16\delta/3{,}5`$, hai điều kiện $`R_x\le\tau`$ và $`R_y\le\tau`$ đủ để bảo đảm sai lệch 2D không quá $`\delta`$. Mức bảo đảm áp dụng cho spline tự nhiên tách theo hai trục trên lưới nút đơn vị.

Mỗi lần phóng ảnh biên hoặc hoa văn lên $`4\times`$, chương trình giải 56 hệ theo hàng và 384 hệ theo cột. Kết quả tính bằng Thomas ở cả hai lượt là mốc đối chiếu. Sai lệch được đo trên $`384\times224=86\,016`$ pixel **trước** lượng tử hóa. Bảng cũng ghi số pixel có giá trị khác nhau sau khi giới hạn dải và làm tròn.

| Ảnh | $`\delta`$ | Vòng tối đa hàng/cột | Sai lệch cực đại | Chặn 2D từ phần dư | Pixel khác sau làm tròn |
|---|---:|---:|---:|---:|---:|
| Biên | 1 | 5 / 4 | 0,106941 | 0,997955 | 57 |
| Biên | 0,1 | 7 / 6 | 0,010628 | 0,094677 | 8 |
| Biên | 0,01 | 9 / 8 | 0,001132 | 0,009858 | 0 |
| Hoa văn | 1 | 5 / 5 | 0,148252 | 0,966029 | 1.726 |
| Hoa văn | 0,1 | 8 / 7 | 0,011788 | 0,099184 | 138 |
| Hoa văn | 0,01 | 10 / 9 | 0,001415 | 0,009976 | 16 |

*Bảng 3. Sai lệch cực đại và chặn tính theo mức xám. Cột cuối đếm pixel sau lượng tử hóa.*

![Bản đồ sai lệch 2D với cùng thang màu](results/day14/ban-do-sai-lech-2d.png)

*Hình 2. Sai lệch giữa hai bộ giải trên ảnh biên và hoa văn ở ba mức dung sai.*

Sáu lần chạy đều thỏa chặn 2D. Chênh lệch nhỏ vẫn có thể làm đổi kết quả lượng tử hóa nếu hai giá trị nằm ở hai phía của một ngưỡng nửa nguyên. Điều này xảy ra ở 16 pixel của ảnh hoa văn khi $`\delta=0{,}01`$.

## Ngày 11–12. Ảnh kết quả và chất lượng nội suy

MAE của phương pháp nội suy lấy **ảnh tham chiếu gốc** $`I`$ làm mốc. Gọi $`\widehat I`$ là ảnh phóng ở dạng số thực, với chiều rộng $`W`$ và chiều cao $`H`$. Hàm $`Q`$ giới hạn mức xám vào đoạn $`[0,255]`$ rồi làm tròn đến số nguyên gần nhất, với giá trị nửa nguyên được làm tròn lên.

```math
\begin{aligned}
Q(z) &= \left\lfloor \min(255,\max(0,z))+0{,}5\right\rfloor,\\
\operatorname{MAE}(\widehat I,I)
  &=\frac{1}{WH}\sum_{j=0}^{H-1}\sum_{i=0}^{W-1}
    \left\lvert Q(\widehat I[j,i])-I[j,i]\right\rvert.
\end{aligned}
```

Năm ảnh, hai mức phóng và ba phương pháp tạo thành **30 phép đo MAE**. Trong bộ thử này, bicubic Keys có MAE thấp nhất trên ảnh biên và nét mảnh ở cả hai mức phóng. Spline tự nhiên dẫn đầu trên hoa văn, Camera và Astronaut. [Bảng 30 giá trị MAE](results/KET_QUA.md)

![Năm ảnh tham chiếu và ảnh phóng 2 lần](results/day14/bo-anh-so-sanh-2x.png)

*Hình 3. So sánh ba phương pháp khi phóng ảnh lên gấp 2 lần.*

![Năm ảnh tham chiếu và ảnh phóng 4 lần](results/day14/bo-anh-so-sanh-4x.png)

*Hình 4. So sánh ba phương pháp khi phóng ảnh lên gấp 4 lần.*

### Mặt cắt biên và mức vượt dải

Xét hàng $`y=64`$ của ảnh biên trước khi giới hạn dải và làm tròn. Mức vượt dải $`O`$ đo khoảng cách lớn nhất từ giá trị trên mặt cắt $`\widehat I`$ đến dải tham chiếu $`[38,216]`$.

```math
O=\max(0,\ 38-\min\widehat I,\ \max\widehat I-216).
```

Song tuyến tính giữ mọi giá trị trên mặt cắt trong dải tham chiếu ở cả hai mức phóng. Ở mức $`2\times`$, bicubic Keys vượt dải $`12{,}52`$ mức xám và spline vượt $`17{,}29`$. Ở mức $`4\times`$, hai số tương ứng là $`6{,}52`$ và $`7{,}02`$. Biên tại $`x=190`$ nằm giữa hai khối khi thu nhỏ theo hệ số 2. Với hệ số 4, một khối chứa cả hai mức sáng và tạo ra mẫu trung gian. Khác biệt ở đầu vào này ảnh hưởng đến mức vượt dải của từng cấu hình.

![Mức xám qua biên ở hai mức phóng](results/day14/mat-cat-bien-2x-4x.png)

*Hình 5. Mặt cắt mức xám quanh biên tại hàng 64, trước lượng tử hóa.*

## Ngày 13–14. Demo và cách trình bày

1. Mở ảnh **nét mảnh** ở $`4\times`$, đổi giữa các phương pháp và so sánh với ảnh tham chiếu. Dùng mặt cắt biên để giải thích vì sao cần xem cả hình và MAE.
2. Chọn **hàng biên** và $`\delta=0{,}1`$ trong phần 1D. Đọc ngưỡng $`1{,}6`$, 5 vòng và sai lệch $`0{,}0130`$. Nối kết quả với chứng minh $`\lVert r\rVert_\infty/16`$.
3. Chọn **hoa văn** và $`\delta=0{,}1`$ trong phần 2D. Đọc sai lệch cực đại $`0{,}0118`$, chặn $`0{,}0992`$ và bản đồ sai lệch. Thang màu của demo tự chỉnh theo cực đại đang hiển thị. Hình trong báo cáo dùng cùng thang màu cho sáu ca.
4. Dùng một lát cắt để minh họa cách tái lấy mẫu trên lưới voxel sau khi đã có khối CT tái tạo. Phần hỏi đáp có thể dùng thêm các slide về chặn 3D. [Kịch bản 7 phút](TAP_BAO_VE_NGAY_18.md) · [Tài liệu tái lấy mẫu của 3D Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/resamplescalarvolume.html)

## Mở rộng 3D. Nội suy giữa các lát

Trên lưới voxel, có thể nội suy từng dãy mẫu theo mỗi trục. Thí nghiệm này chỉ làm thưa theo $`z`$ để khảo sát ảnh hưởng của khoảng cách giữa các lát. Hàm Gaussian trơn cung cấp cường độ tham chiếu tại mọi voxel.

```math
I(x,y,z)=200\exp\left(-\frac{(x-8)^2+(y-8)^2}{24}-\frac{(z-6)^2}{8}\right).
```

Lưới tham chiếu có bước 1 mm, với $`x,y\in\{0,\ldots,16\}`$ và $`z\in\{0,\ldots,12\}`$ theo đơn vị mm. Hai phương pháp nhận cùng năm lát tại $`z=0,3,6,9,12`$ mm. Cách chọn này giữ hai đầu miền và để lại hai vị trí kiểm tra giữa mỗi cặp lát. Đặt $`p=z/3`$ để đưa bước nút về 1, rồi nội suy tuyến tính hoặc spline tự nhiên trên mỗi dãy $`I(x,y,\cdot)`$. Phương pháp spline dùng Thomas để giải hệ.

Tám lát dành cho kiểm tra có $`17\cdot17\cdot8=2\,312`$ voxel. MAE trước lượng tử hóa là **4,070801** với tuyến tính và **0,369592** với spline, theo đơn vị cường độ quy ước của khối Gaussian. Thí nghiệm minh họa việc tạo lát cắt trung gian từ một thể tích đã có. [Mã mô phỏng](run_3d.mjs) · [Kết quả 3D](results/KET_QUA_3D.json) · [3D Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/resamplescalarvolume.html)

[Phần nâng cao](BAO_CAO_NANG_CAO.md) làm thưa theo cả ba trục, thêm PCHIP và phantom có biên gắt, rồi kiểm chứng chặn sai lệch 3D với các cách chia ngưỡng khác nhau.

## Ngày 15–18. Đối chiếu kết quả và chuẩn bị bảo vệ

Ở mốc ngày 18, dự án được dựng lại trong một thư mục sạch từ mã nguồn và hai ảnh chụp gốc. Tám kiểm thử khi đó đều đạt. Mã SHA-256 của danh mục dữ liệu, hai tệp kết quả 2D, kết quả 3D, tám hình 2D và demo HTML khớp với bản trong thư mục dự án. Sau khi bổ sung PCHIP, bộ kiểm thử hiện có chín ca.

Khi đọc kết quả, ghi rõ mốc so sánh. MAE 2D dùng ảnh gốc, còn MAE 3D dùng cường độ Gaussian trên các lát dành cho kiểm tra. Sai lệch từ bộ giải được đo giữa hai kết quả spline trước lượng tử hóa. [Kịch bản trình bày, câu hỏi bảo vệ và ảnh dự phòng](TAP_BAO_VE_NGAY_18.md)

### Chạy lại từ dữ liệu đã lưu

Demo là một tệp HTML chứa ảnh mẫu và mã tính, mở trực tiếp được khi offline. Để tái lập số liệu và ảnh minh họa trong thư mục dự án, dùng Node.js và Python với NumPy, Pillow, Matplotlib.

```text
python prepare_data.py
node --test verify.mjs
node run_experiments.mjs
python generate_figures.py
node run_day14.mjs
python generate_day14_figures.py
node run_3d.mjs
node build_demo.mjs
```

[Mã nội suy và hai bộ giải](src/interpolation.mjs) · [Thiết lập và phép đo ngày 14](run_day14.mjs) · [Số liệu JSON](results/day14/KET_QUA_NGAY_14.json)
