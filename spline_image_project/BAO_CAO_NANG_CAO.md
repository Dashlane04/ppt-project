# Nội suy giữ dải mức xám và kiểm soát sai lệch spline 3D

Ba thí nghiệm mở rộng khảo sát cách chia ngưỡng giữa các lượt nội suy, khả năng giữ dải cường độ của PCHIP và việc tái lấy mẫu khối 3D. MAE đo chất lượng nội suy so với dữ liệu tham chiếu. Sai lệch bộ giải đo chênh lệch cực đại giữa Gauss–Seidel và Thomas trên cùng spline, trước lượng tử hóa. [Báo cáo chính](BAO_CAO_NGAY_14.md)

## 1. Chia ngưỡng dừng cho hai lượt nội suy

Gọi $`R_x`$ và $`R_y`$ là phần dư lớn nhất ở lượt ngang và lượt dọc. Chặn 2D là $`(2{,}5R_x+R_y)/16`$. Nếu dành tỷ lệ $`\alpha`$ của sai lệch cho phép $`\delta`$ cho lượt ngang và phần còn lại cho lượt dọc, hai ngưỡng phần dư là

```math
\tau_x=\frac{16\delta\alpha}{2{,}5},\qquad
\tau_y=16\delta(1-\alpha).
```

Khi $`R_x\le\tau_x`$ và $`R_y\le\tau_y`$, chặn trên cho $`E_{\mathrm{2D}}\le\delta`$. Giá trị $`\alpha=5/7`$ cho hai ngưỡng phần dư bằng nhau. Ba giá trị thử thêm là $`1/4`$, $`1/2`$ và $`3/4`$, lần lượt dành nhiều sai lệch hơn cho lượt dọc, chia đều, hoặc dành nhiều hơn cho lượt ngang.

Thử trên ảnh biên và hoa văn ở mức phóng $`4\times`$ với $`\delta=0{,}1`$, nghiệm đầu bằng 0 và giới hạn 500 vòng mỗi hệ. Từ ảnh nhỏ $`96\times56`$, chương trình giải 56 hệ theo hàng với 94 ẩn mỗi hệ, sau đó giải 384 hệ theo cột với 54 ẩn mỗi hệ. Tổng số lần cập nhật ẩn là $`W=\sum_j n_j k_j`$, với $`n_j`$ là số ẩn và $`k_j`$ là số vòng quét của hệ $`j`$. Đại lượng $`W`$ đếm riêng công việc cập nhật nghiệm trong Gauss–Seidel.

| Phần sai lệch dành cho ngang | Cập nhật ẩn · Biên | Sai lệch · Biên | Cập nhật ẩn · Hoa văn | Sai lệch · Hoa văn |
|---|---:|---:|---:|---:|
| $`5/7`$ · cùng ngưỡng | 57.120 | 0,010628 | 166.804 | 0,011788 |
| $`1/4`$ | 57.932 | 0,027280 | **152.578** | 0,025858 |
| $`1/2`$ | **55.590** | 0,018176 | 158.870 | 0,017856 |
| $`3/4`$ | 57.836 | 0,008900 | 167.710 | 0,011788 |

*Bảng 1. Số lần cập nhật ẩn và sai lệch cực đại trước lượng tử hóa, tính theo mức xám.*

Cả tám ca đều thỏa chặn. So với mốc cùng ngưỡng, cấu hình cần ít cập nhật nhất giảm **2,68%** trên ảnh biên ở $`\alpha=1/2`$ và **8,53%** trên hoa văn ở $`\alpha=1/4`$. Hai cấu hình đánh đổi sai lệch cao hơn để giảm số lần cập nhật và vẫn đạt mục tiêu $`0{,}1`$ mức xám. Khi dành $`3/4`$ cho lượt ngang, số cập nhật tăng trên cả hai ảnh. [Thử đổi cấu hình trong demo](demo.html)

## 2. PCHIP và độ vượt dải ở biên ảnh

PCHIP nối các đoạn Hermite bậc ba bằng cách dùng chung giá trị và đạo hàm cấp một tại nút nối. Với bước nút bằng 1, đặt $`s_i=f_{i+1}-f_i`$. Ở nút trong, nếu $`s_{i-1}`$ và $`s_i`$ cùng dấu và khác 0, chọn độ dốc $`d_i`$ là trung bình điều hòa của chúng. Khi một khoảng phẳng hoặc hai sai phân trái dấu, đặt $`d_i=0`$.

```math
d_i=
\begin{cases}
\dfrac{2}{1/s_{i-1}+1/s_i}, & s_{i-1}s_i>0,\\[4pt]
0, & s_{i-1}s_i\le0.
\end{cases}
```

Ở đầu dãy, bắt đầu từ ước lượng một phía $`(3s_0-s_1)/2`$. Đưa ước lượng về 0 nếu dấu khác $`s_0`$, rồi giới hạn độ lớn ở $`3\lvert s_0\rvert`$. Đầu kia xử lý đối xứng. Với hai mẫu, PCHIP cho đoạn thẳng. Với một mẫu, kết quả là hằng số. [Fritsch và Butland, SIAM](https://doi.org/10.1137/0905021)

Với $`t\in[0,1]`$, $`u=1-t`$, đa thức trên đoạn $`[i,i+1]`$ là

```math
H_i(t)=(1+2t)u^2 f_i+(3-2t)t^2f_{i+1}+tu^2d_i-t^2u d_{i+1}.
```

Nếu $`s_i=0`$, hai độ dốc bằng 0 và đoạn là hằng số. Nếu $`s_i\ne0`$, quy tắc chọn độ dốc cho $`a=d_i/s_i`$ và $`b=d_{i+1}/s_i`$ nằm trong $`[0,3]`$. Với mỗi $`t`$, đạo hàm chuẩn hóa $`H'_i(t)/s_i`$ là hàm affine của $`(a,b)`$. Tại bốn góc $`(0,0)`$, $`(3,0)`$, $`(0,3)`$ và $`(3,3)`$, giá trị tương ứng là $`6t(1-t)`$, $`3(1-t)^2`$, $`3t^2`$ và $`3(2t-1)^2`$. Cả bốn giá trị đều không âm nên $`H'_i(t)/s_i\ge0`$ trên cả hình vuông. Đoạn Hermite vì vậy đơn điệu theo chiều của $`s_i`$ và nằm trong dải của hai mẫu đầu mút. Áp dụng lần lượt theo các trục giúp giữ dải cường độ của đầu vào trong số học chính xác.

Ảnh biên và nét mảnh giúp quan sát các vùng chuyển mức nhanh. Phép thử giữ nguyên cách thu nhỏ và quy ước tâm pixel trong báo cáo chính. MAE được tính sau lượng tử hóa 8 bit. Mức vượt dải $`O`$ được tính trước lượng tử hóa trên toàn ảnh phóng $`\widehat f`$, lấy ảnh nhỏ $`f`$ làm mốc.

```math
O=\max\bigl(0,\min f-\min\widehat f,\max\widehat f-\max f\bigr).
```

Vì $`O`$ lấy cực trị trên toàn ảnh, giá trị này có thể lớn hơn mức vượt dải của riêng mặt cắt tại hàng 64.

| Ảnh · Mức phóng | MAE tuyến tính | MAE Keys | MAE spline | MAE PCHIP | $`O`$ spline | $`O`$ PCHIP |
|---|---:|---:|---:|---:|---:|---:|
| Biên · $`2\times`$ | 0,3350 | 0,3336 | 0,3987 | **0,2363** | 25,95 | 0 |
| Biên · $`4\times`$ | 0,8905 | 0,8434 | 0,8481 | **0,7143** | 17,46 | 0 |
| Nét mảnh · $`2\times`$ | 8,6348 | 7,5106 | 7,7117 | **6,4913** | 43,84 | 0 |
| Nét mảnh · $`4\times`$ | 15,4914 | 15,1636 | 16,4544 | **13,5812** | 58,38 | 0 |

*Bảng 2. MAE và mức vượt dải, tính theo mức xám.*

![Mặt cắt hàng 64 trên ảnh biên trước lượng tử hóa](results/advanced/mat-cat-pchip.png)

*Hình 1. Mặt cắt qua biên để quan sát vị trí các phương pháp vượt dải.*

## 3. Tái lấy mẫu khối phantom và tạo lát cắt

Thí nghiệm minh họa bước **tái lấy mẫu sau khi đã có khối CT tái tạo**. Từ các giá trị voxel trên lưới ban đầu, chương trình nội suy sang lưới mới theo tọa độ vật lý rồi trích ba lát theo các mặt phẳng ngang, trán và dọc. Hai khối dùng trong thí nghiệm là dữ liệu tổng hợp với cường độ quy ước. [3D Slicer, Resample Scalar Volume](https://slicer.readthedocs.io/en/latest/user_guide/modules/resamplescalarvolume.html)

| Thành phần | Điều kiện và lý do |
|---|---|
| Lưới tham chiếu | $`33\times33\times25`$ voxel, bước $`1\times1\times1`$ mm, gốc $`(0,0,0)`$. Kích thước cho phép giữ nguyên hai đầu mỗi trục khi lấy thưa. |
| Lưới đầu vào | $`17\times17\times9`$, bước $`2\times2\times3`$ mm. Trục $`z`$ thưa hơn để mô phỏng khoảng cách lát khác khoảng cách trong mặt phẳng. Lấy giá trị đúng tại nút của khối tổng hợp. |
| Ba lượt nội suy | $`x\to y\to z`$, kích thước trung gian $`33\times17\times9`$, rồi $`33\times33\times9`$, cuối cùng $`33\times33\times25`$. Chuẩn hóa tọa độ truy vấn thành $`p_x=x/2,\ p_y=y/2,\ p_z=z/3`$. Mỗi hệ spline dùng bước nút $`1`$. |
| Đánh giá | Dùng 2.601 voxel đầu vào để kiểm tra khả năng khớp nút. Tính MAE trước lượng tử hóa trên **24.624 voxel ngoài lưới đầu vào**, tức các vị trí chưa có mẫu ở ít nhất một trục. Đo vượt dải trên toàn khối đầu ra. |

*Bảng 3. Lưới đầu vào, lưới đích và cách đánh giá trên dữ liệu 3D.*

Khối Gaussian $`G`$ cho cường độ biến thiên trơn. Khối mô phỏng thứ hai dùng hàm $`\rho`$ để xác định các vùng cường độ.

```math
\begin{aligned}
G(x,y,z)
  &=200\exp\left(-\frac{(x-16)^2+(y-16)^2}{80}
                -\frac{(z-12)^2}{24}\right),\\
\rho(x,y,z)
  &=\left(\frac{x-16}{12}\right)^2
    +\left(\frac{y-16}{10}\right)^2
    +\left(\frac{z-12}{9}\right)^2.
\end{aligned}
```

Phantom có nền cường độ 15 khi $`\rho\gt 1`$, vỏ cường độ 220 khi $`0{,}73\le\rho\le1`$ và lõi cường độ 65 khi $`\rho\lt 0{,}73`$. Phần lõi bên trong ellipsoid $`\bigl((x-20)/3\bigr)^2+\bigl((y-14)/3\bigr)^2+\bigl((z-11)/4\bigr)^2\le1`$ có cường độ 135. Vỏ sáng và vùng chèn giúp quan sát sai lệch quanh biên và trên chi tiết nhỏ.

| Khối | MAE tuyến tính | MAE spline | MAE PCHIP | Vượt dải spline | Vượt dải PCHIP |
|---|---:|---:|---:|---:|---:|
| Gaussian trơn | 1,0022 | **0,0895** | 0,2856 | 0 | 0 |
| Phantom biên gắt | 11,5900 | 14,4058 | **11,2396** | 47,6797 | 0 |

*Bảng 4. MAE trên các voxel ngoài lưới đầu vào và mức vượt dải toàn khối.*

![Lát axial z = 11 mm ở giữa hai lát đầu vào, dùng chung thang cường độ](results/advanced/lat-axial-phantom.png)

*Hình 2. Lát ngang tại $`z=11`$ mm, nằm giữa hai lát đầu vào.*

![Ba mặt cắt qua khối tham chiếu và khối nội suy PCHIP](results/advanced/mpr-phantom.png)

*Hình 3. Ba mặt cắt qua khối tham chiếu và khối tái lấy mẫu bằng PCHIP.*

### Chặn sai lệch bộ giải qua ba trục

Gọi $`X,Y,Z`$ là các phép spline chính xác theo ba trục và $`\widetilde X,\widetilde Y,\widetilde Z`$ là các phép tính tương ứng bằng Gauss–Seidel. Với cùng đầu vào tại lượt $`a`$, sai lệch giữa hai cách tính bị chặn bởi $`R_a/16`$. Mỗi phép spline chính xác có chuẩn không vượt $`B=2{,}5`$ trên lưới nút đơn vị. Với khối đầu vào $`F`$, cộng rồi trừ các kết quả trung gian để tách sai lệch thành ba số hạng.

```math
\begin{aligned}
\widetilde Z\widetilde Y\widetilde X F-ZYX F
={}&(\widetilde Z-Z)(\widetilde Y\widetilde X F)\\
&+Z\big[(\widetilde Y-Y)(\widetilde X F)\big]\\
&+ZY\big[(\widetilde X-X)F\big].
\end{aligned}
```

Sai lệch theo $`x`$ đi qua hai phép spline chính xác, sai lệch theo $`y`$ đi qua một phép, còn sai lệch theo $`z`$ xuất hiện ở lượt cuối. Áp dụng bất đẳng thức tam giác và chặn chuẩn cho từng số hạng, ta có

```math
E_{\mathrm{3D}}
\le \frac{B^2R_x+BR_y+R_z}{16}
= \frac{6{,}25R_x+2{,}5R_y+R_z}{16}.
```

Với trọng số $`w=(6{,}25,\ 2{,}5,\ 1)`$, chọn các tỷ lệ không âm sao cho $`\alpha_x+\alpha_y+\alpha_z=1`$ và đặt $`\tau_a=16\delta\alpha_a/w_a`$. Nếu $`R_a\le\tau_a`$ ở cả ba lượt thì $`E_{\mathrm{3D}}\le\delta`$. Chọn tỷ lệ $`w/9{,}75`$ cho cùng ngưỡng phần dư ở cả ba trục. Ba cấu hình còn lại chia đều $`(1/3,1/3,1/3)`$, tăng theo thứ tự lượt $`(1/6,1/3,1/2)`$ hoặc dành phần lớn cho $`z`$ với $`(0{,}10,\ 0{,}25,\ 0{,}65)`$. Vì các lượt $`x,y,z`$ lần lượt giải 153, 297 và 1.089 hệ, hai cấu hình cuối kiểm tra xem nới ngưỡng ở lượt có nhiều hệ hơn có giảm tổng số cập nhật hay không.

| Khối · $`\delta=0{,}1`$ | Cấu hình tốt nhất trong các ca thử | Cập nhật · cùng ngưỡng → cấu hình chọn | Sai lệch cực đại | Chặn đo từ phần dư |
|---|---|---:|---:|---:|
| Gaussian | $`(1/6,1/3,1/2)`$ | 49.229 → 44.022 | 0,015196 | 0,097584 |
| Phantom | $`(0{,}10,0{,}25,0{,}65)`$ | 53.522 → 47.877 | 0,024180 | 0,097570 |

*Bảng 5. Cấu hình có ít lần cập nhật nhất trên mỗi khối ở mức $`\delta=0{,}1`$. Hai cột cuối dùng đơn vị cường độ quy ước.*

Cả **24 ca** gồm hai khối, bốn cấu hình và ba mức $`\delta\in\{1,\ 0{,}1,\ 0{,}01\}`$ đều thỏa chặn và đạt mục tiêu. Với phantom ở $`\delta=0{,}1`$, cấu hình được chọn giảm 10,55% số lần cập nhật so với mốc cùng ngưỡng. Sai lệch cực đại $`0{,}024180`$ được đo giữa hai bộ giải trên cùng một spline. MAE $`14{,}4058`$ được đo giữa spline và khối tham chiếu. Hai kết quả cho thấy việc siết ngưỡng dừng chỉ kiểm soát phần sai lệch phát sinh từ bộ giải.

## Tái lập kết quả

Chạy trong thư mục `spline_image_project`. Bước tạo hình cần NumPy và Matplotlib. Quy trình dựng lại demo từ dữ liệu đầu vào được ghi ở README. [Hướng dẫn chạy toàn bộ dự án](../README.md#chạy-lại-thí-nghiệm)

```sh
node --test verify.mjs
node run_advanced.mjs
python generate_advanced_figures.py
```

[Kết quả đầy đủ](results/advanced/KET_QUA_NANG_CAO.json) · [Dữ liệu dùng để vẽ](results/advanced/DU_LIEU_HINH.json)
