from pathlib import Path
import math, csv, json
import numpy as np
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color, white
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output/pdf'; IMG=OUT/'gmres_images'; TMP=ROOT/'tmp/pdfs'
IMG.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialB','C:/Windows/Fonts/arialbd.ttf'))
W,H=841.89,595.28
INK='#163149'; BLUE='#245AC0'; TEAL='#00887A'; ORANGE='#D87524'; MUTED='#536779'; LIGHT='#EDF3FA'
SOURCES={
 'FNC':('Driscoll & Braun, Fundamentals of Numerical Computation: LU','https://fncbook.com/lu/'),
 'KTH':('Elias Jarlebring, KTH, Iterative methods for linear systems (2016)','https://www.math.kth.se/na/SF2524/matber15/linsys.pdf'),
 'NET':('Barrett et al., Templates for the Solution of Linear Systems','https://netlib.org/templates/templates.html'),
 'SCI':('SciPy: GMRES, tiêu chuẩn dừng và tiền điều kiện trái','https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.gmres.html'),
 'ILU':('SciPy: phân tích LU không đầy đủ theo ngưỡng','https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.spilu.html')}
PDF=OUT/'GMRES_hinh_anh_va_mo_hinh.pdf'
c=canvas.Canvas(str(PDF),pagesize=(W,H)); c.setTitle('GMRES - Hình ảnh và mô hình'); c.setAuthor('Tài liệu minh họa học tập')
page=0
def text(x,y,s,size=12,color=INK,bold=False):
 c.setFillColor(HexColor(color));c.setFont('ArialB' if bold else 'Arial',size);c.drawString(x,y,str(s))
def para(x,y,w,s,size=12,color=INK):
 st=ParagraphStyle('p',fontName='Arial',fontSize=size,leading=size*1.45,textColor=HexColor(color))
 p=Paragraph(s,st);_,h=p.wrap(w,500);p.drawOn(c,x,y-h);return h
def box(x,y,w,h,label,color=BLUE,fs=13):
 c.setFillColor(HexColor(LIGHT));c.setStrokeColor(HexColor(color));c.setLineWidth(1.2);c.roundRect(x,y,w,h,9,fill=1)
 para(x+12,y+h/2+fs*.7,w-24,label,fs,color)
def arrow(x1,y1,x2,y2,col=BLUE):
 c.setStrokeColor(HexColor(col));c.setFillColor(HexColor(col));c.setLineWidth(1.8);c.line(x1,y1,x2,y2)
 a=math.atan2(y2-y1,x2-x1);p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-9*math.cos(a-.4),y2-9*math.sin(a-.4));p.lineTo(x2-9*math.cos(a+.4),y2-9*math.sin(a+.4));p.close();c.drawPath(p,fill=1,stroke=0)
def start(k,title,subtitle):
 global page;page+=1
 c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(HexColor(BLUE));c.rect(0,H-12,W,12,fill=1,stroke=0)
 text(36,H-44,'GMRES  /  BỘ HÌNH MINH HỌA',10,BLUE,True);text(36,H-83,title,25,bold=True)
 para(36,H-99,W-72,subtitle,11,MUTED)
 c.setFillColor(HexColor('#F7F9FC'));c.roundRect(30,180,W-60,270,12,fill=1,stroke=0)
 text(W-76,24,f'{page:02d}',11,BLUE,True)
def end(notes,source,original=True):
 for i,n in enumerate(notes):para(42,158-i*35,W-84,'<b>'+['Đọc hình: ','Cần giải thích: ','Dùng ở phần: '][i]+'</b>'+n,11)
 title,url=SOURCES[source]
 text(36,39,('Sơ đồ tự dựng; tham khảo: ' if original else 'Hình trích từ: ')+source,8,MUTED)
 text(36,25,url,8,MUTED);c.linkURL(url,(36,20,745,36),relative=0)
 c.showPage()
def matrix(x,y,A,cell=30,mode='num',color=BLUE):
 A=np.asarray(A);r,s=A.shape
 for i in range(r):
  for j in range(s):
   xx=x+j*cell;yy=y-i*cell
   if mode=='mask':
    c.setFillColor(HexColor(color if A[i,j] else '#DFE6EF'));c.rect(xx,yy-cell+2,cell-3,cell-3,fill=1,stroke=0)
   else:text(xx+5,yy-cell*.65,f'{A[i,j]:g}',12,color)
 c.setStrokeColor(HexColor(INK));c.setLineWidth(1)
 for xx,sgn in [(x-5,1),(x+s*cell,-1)]:
  c.line(xx,y+3,xx,y-r*cell);c.line(xx,y+3,xx+sgn*5,y+3);c.line(xx,y-r*cell,xx+sgn*5,y-r*cell)

# External figure: retain graph only, no surrounding source prose.
d=pdfium.PdfDocument(str(TMP/'sources/kth_linsys.pdf'))
im=d[1].render(scale=4).to_pil(); ww,hh=im.size
im.crop((int(ww*.662),int(hh*.397),int(ww*.889),int(hh*.537))).save(IMG/'11_kth_residual_error.png')

start(1,'Bản đồ các khái niệm','Một mạch trình bày: hệ tuyến tính -> không gian tìm kiếm -> nghiệm gần đúng -> đánh giá chi phí.')
for x,y,w,h,l,col in [(55,335,165,70,'Hệ thưa<br/><b>Ax = b</b>',BLUE),(288,335,190,70,'Krylov + Arnoldi<br/>Tạo cơ sở tìm kiếm',BLUE),(552,335,230,70,'GMRES + QR/Givens<br/>Cực tiểu chuẩn phần dư',BLUE),(55,215,165,66,'LU -> ILU<br/>Tạo tiền điều kiện P',TEAL),(288,215,190,66,'Restart m<br/>Giới hạn cơ sở lưu trữ',ORANGE),(552,215,230,66,'Kiểm tra nghiệm<br/>Phần dư, sai số, chi phí',TEAL)]:box(x,y,w,h,l,col)
arrow(220,370,288,370);arrow(478,370,552,370);arrow(137,281,137,335,TEAL);arrow(384,281,384,335,ORANGE);arrow(667,335,667,281,TEAL)
end(['Krylov là không gian; Arnoldi là thuật toán dựng cơ sở; GMRES lựa chọn nghiệm.','ILU hỗ trợ GMRES thông qua tiền điều kiện; restart kiểm soát chi phí lưu cơ sở.','Mở đầu và giới thiệu phạm vi đề tài.'],'NET')

start(2,'LU: giải hai hệ tam giác','Ví dụ số nhỏ; giả sử không cần đổi hàng. Trong thực tế có thể dùng hoán vị ΠA = LU.')
A=np.array([[4,1],[2,3]]);L=np.array([[1,0],[.5,1]]);U=np.array([[4,1],[0,2.5]])
matrix(90,403,A,42);text(205,350,'=',22);matrix(255,403,L,42);text(365,350,'×',22);matrix(415,403,U,42)
text(109,295,'A',14,bold=True);text(277,295,'L',14,bold=True);text(437,295,'U',14,bold=True)
box(563,327,205,90,'L: tam giác dưới<br/>U: tam giác trên',TEAL)
box(75,215,190,55,'Ly = b -> y = (1; 1.5)',BLUE,12);arrow(265,242,324,242);box(324,215,215,55,'Ux = y -> x = (0.1; 0.6)',TEAL,12);text(580,237,'b = (1; 2)',14)
end(['Từ A = LU, giải Ly = b bằng thế tiến rồi Ux = y bằng thế lùi.','LU có quan hệ với khử Gauss; không cần tạo A nghịch đảo để tìm nghiệm.','Nền tảng trước khi giới thiệu ILU.'],'FNC')

start(3,'ILU(0): bỏ fill-in để giữ cấu trúc thưa','Đối chiếu trên cùng một ví dụ 3 × 3; các thừa số ILU(0) được tính không đổi hàng.')
B=np.array([[4.,1,1],[1,4,0],[1,0,4]]);Li=np.array([[1.,0,0],[.25,1,0],[.25,0,1]]);Ui=np.array([[4.,1,1],[0,3.75,0],[0,0,3.75]])
matrix(70,405,B,32);text(190,350,'≈',23);matrix(230,405,Li,32);text(350,350,'×',22);matrix(390,405,Ui,32)
text(85,280,'A',13,bold=True);text(240,280,'L chưa đầy đủ',11);text(405,280,'U chưa đầy đủ',11)
box(540,295,235,125,'Khử hàng 2 theo hàng 1:<br/>a23 mới = 0 - 1/4<br/><b>Fill-in = -0.25</b><br/>ILU(0) bỏ vị trí mới này.',ORANGE,12)
text(75,232,'P = L × U = A + E; ở ví dụ này E23 = E32 = 0.25.',14,TEAL,True)
end(['Các thừa số giữ mẫu thưa, nhưng tích P có thể chứa vị trí khác không mới.','ILU(0) không giữ mọi fill-in. ILU theo ngưỡng dùng quy tắc bỏ phần tử khác.','Chi phí, độ chính xác của tiền điều kiện và phân biệt LU với ILU.'],'NET')

start(4,'Krylov: mở rộng tập hướng hiệu chỉnh','Kk(A,r0) = span{r0, Ar0, ..., A^(k-1)r0}; nghiệm tìm trong x0 + Kk.')
ox,oy=180,225
arrow(ox,oy,ox+240,oy,'#A7B6C8');arrow(ox,oy,ox,oy+190,'#A7B6C8')
arrow(ox,oy,ox+60,oy+120,BLUE);text(ox+15,oy+130,'r0 = (1; 2)',12,BLUE)
arrow(ox,oy,ox+180,oy+160,TEAL);text(ox+175,oy+175,'Ar0 = (6; 8)',12,TEAL)
box(515,335,255,80,'K1: c1 r0<br/>Một hướng tìm kiếm',BLUE)
box(515,220,255,85,'K2: c1 r0 + c2 Ar0<br/>Hai hướng độc lập trong ví dụ',TEAL)
text(65,195,'Hướng vẽ đã đổi tỉ lệ riêng để dễ nhìn; không thể hiện độ dài tương đối.',9,MUTED)
end(['Dùng A = [[4,1],[2,3]], x0 = 0, b = r0 = (1;2). K2 phủ toàn bộ R².','Krylov là tập mọi tổ hợp tuyến tính; không phải lấy lần lượt r0, Ar0 làm nghiệm.','Định nghĩa không gian tìm kiếm trước Arnoldi và GMRES.'],'KTH')

start(5,'Arnoldi: cơ sở trực chuẩn và Hessenberg','Tạo các vectơ v1,...,vk cùng sinh ra không gian Krylov, nhưng thuận lợi hơn cho tính toán.')
for x,l in [(55,'w = A vj'),(300,'Loại thành phần theo<br/>v1,...,vj'),(565,'Chuẩn hóa phần còn lại<br/>để tạo v(j+1)')]:box(x,335,220,75,l,BLUE,13)
arrow(275,373,300,373);arrow(520,373,565,373)
text(65,270,'A Vk  =  V(k+1) H̄k',23,TEAL,True)
text(65,230,'Vk: N × k     |     V(k+1): N × (k+1)',13)
mask=np.triu(np.ones((5,4)),k=-1);matrix(575,310,mask,20,'mask');text(685,258,'H̄k',18,TEAL);text(552,195,'Mẫu Hessenberg trên (ví dụ k = 4)',10,MUTED)
end(['Modified Gram-Schmidt loại các hình chiếu rồi chuẩn hóa vectơ mới.','Sai số làm tròn có thể làm mất trực giao. Breakdown không luôn là thất bại.','Cơ chế xây dựng cơ sở và ma trận nhỏ của GMRES.'],'KTH')

start(6,'GMRES: hình học của cực tiểu phần dư','Trong không gian ảnh A Kk, chọn vectơ gần r0 nhất theo chuẩn Euclid.')
o=np.array([125,230]);q=np.array([390,290]);b=np.array([330,415]);proj=o+np.dot(b-o,q-o)/np.dot(q-o,q-o)*(q-o)
arrow(*o,490,313,TEAL);text(400,245,'A K1',14,TEAL)
arrow(*o,*b,BLUE);text(310,426,'r0',15,BLUE)
arrow(*o,*proj,TEAL);arrow(*proj,*b,ORANGE);text(370,345,'r1',15,ORANGE)
c.setStrokeColor(HexColor(MUTED));u=(q-o)/np.linalg.norm(q-o);v=(b-proj)/np.linalg.norm(b-proj);p=c.beginPath();p.moveTo(*(proj+u*12));p.lineTo(*(proj+u*12+v*12));p.lineTo(*(proj+v*12));c.drawPath(p)
box(535,320,245,100,'xk = x0 + Vk y<br/>Chọn y để ||b - A xk||₂<br/>nhỏ nhất trong tập cho phép.',BLUE,13)
box(535,210,245,75,'Bài toán nhỏ:<br/>min ||β e1 - H̄k y||₂',TEAL,14)
end(['Đoạn màu cam là phần dư; điều kiện cực tiểu cho r vuông góc A Kk.','Trong hình là không gian ảnh, không phải hình chiếu nghiệm lên Kk.','Suy ra bài toán bình phương tối thiểu và giải thích chữ “minimum residual”.'],'KTH')

start(7,'QR và Givens: giải bài toán nhỏ','Các phép biến đổi trực giao bảo toàn chuẩn 2, giúp cập nhật bình phương tối thiểu qua từng bước.')
matrix(85,410,np.triu(np.ones((5,4)),k=-1),26,'mask');text(80,235,'H̄k: Hessenberg',12)
arrow(225,340,330,340);text(240,365,'Givens',12,BLUE)
matrix(380,410,np.triu(np.ones((5,4))),26,'mask',TEAL);text(370,235,'[ Rk ; 0 ]',15,TEAL)
box(570,325,210,90,'Quay cả vế phải<br/>βe1 -> g<br/>Giải Rk y = g[1:k]',TEAL,13)
box(570,215,210,75,'Không lập H̄kᵀH̄k<br/>để giải bài toán nhỏ.',ORANGE,12)
end(['Mỗi phép quay triệt một phần tử dưới đường chéo; phần đuôi vế phải cho ước lượng phần dư.','Sai số hữu hạn có thể tạo chênh lệch giữa ước lượng này và phần dư thực.','Cài đặt GMRES và liên hệ với phân tích QR đã học.'],'NET')

start(8,'ILU trong GMRES: một phép giải phụ mỗi bước','Tiền điều kiện trái: Ã = P⁻¹A, b̃ = P⁻¹b. Arnoldi chạy trên toán tử Ã.')
for x,l in [(55,'t = A vj'),(300,'L w = t<br/>Thế tiến'),(565,'U z = w<br/>Thế lùi')]:box(x,330,220,80,l,TEAL,14)
arrow(275,370,300,370,TEAL);arrow(520,370,565,370,TEAL)
text(80,285,'Kết quả: z = P⁻¹(A vj), với P = LU là tiền điều kiện ILU.',15,bold=True)
box(65,205,335,55,'GMRES cực tiểu ||P⁻¹(b - Ax)||₂',BLUE,13)
box(440,205,335,55,'Xác nhận bằng ||b - Ax||₂ / ||b||₂',ORANGE,13)
end(['Không dựng P nghịch đảo; áp dụng bằng phép giải với các thừa số.','Số bước giảm chưa chắc tổng thời gian giảm: phải cộng chi phí tạo và áp dụng P.','Mô hình triển khai và điều kiện dừng có tiền điều kiện trái.'],'SCI')

start(9,'Restart: giữ nghiệm, xây lại cơ sở','GMRES(m) giới hạn tối đa m hướng trong mỗi chu kỳ, rồi tiếp tục từ phần dư mới.')
for x,l in [(55,'Chu kỳ 1<br/>r0 -> cơ sở V -> x mới'),(300,'Restart<br/>r = b - A x mới'),(565,'Chu kỳ 2<br/>Cơ sở mới từ r')]:box(x,330,220,85,l,BLUE,13)
arrow(275,373,300,373);arrow(520,373,565,373)
box(65,215,335,80,'m nhỏ<br/>Ít bộ nhớ, có thể đình trệ',ORANGE,14)
box(440,215,335,80,'m lớn<br/>Nhiều hướng, trực chuẩn hóa tốn hơn',TEAL,14)
end(['Cơ sở cũ không được giữ toàn bộ; nghiệm đã đạt vẫn được giữ lại.','Bộ nhớ cơ sở O(Nm); trực chuẩn hóa khoảng O(Nm²) mỗi chu kỳ dài m.','Giải thích đánh đổi và thiết kế thí nghiệm thay đổi restart.'],'NET')

# Reproducible, real numerical example; no invented performance curves.
side=8;N=side*side;A=np.zeros((N,N))
for i in range(N):
 A[i,i]=4.5
 for j,w in [(i-1,-.7),(i+1,-1.3),(i-side,-.9),(i+side,-1.1)]:
  if 0<=j<N and (abs(j-i)!=1 or j//side==i//side):A[i,j]=w
scale=np.logspace(-1,1,N);A=scale[:,None]*A
xstar=np.sin(np.arange(N)+1);b=A@xstar
ilu=A.copy();mask=A!=0
for i in range(N):
 for j in range(i):
  if mask[i,j]:
   ilu[i,j]/=ilu[j,j]
   for k in range(j+1,N):
    if mask[i,k]:ilu[i,k]-=ilu[i,j]*ilu[j,k]
def ip(v):
 y=v.copy()
 for i in range(N):y[i]-=ilu[i,:i]@y[:i]
 for i in range(N-1,-1,-1):y[i]=(y[i]-ilu[i,i+1:]@y[i+1:])/ilu[i,i]
 return y
def solve(M):
 x=np.zeros(N);hist=[1.];total=0
 while total<200:
  r=b-A@x;z=M(r);beta=np.linalg.norm(z);V=np.zeros((N,21));hh=np.zeros((21,20));V[:,0]=z/beta;base=x.copy()
  for j in range(20):
   w=M(A@V[:,j])
   for i in range(j+1):hh[i,j]=V[:,i]@w;w-=hh[i,j]*V[:,i]
   hh[j+1,j]=np.linalg.norm(w)
   if hh[j+1,j]>1e-14:V[:,j+1]=w/hh[j+1,j]
   rhs=np.zeros(j+2);rhs[0]=beta;y=np.linalg.lstsq(hh[:j+2,:j+1],rhs,rcond=None)[0];x=base+V[:,:j+1]@y
   rr=np.linalg.norm(b-A@x)/np.linalg.norm(b);hist.append(float(rr));total+=1
   if rr<=1e-8 or total>=200 or hh[j+1,j]<=1e-14:break
  if hist[-1]<=1e-8:break
 return hist,float(np.linalg.norm(x-xstar)/np.linalg.norm(xstar))
results={name:solve(M) for name,M in [('Không tiền điều kiện',lambda v:v.copy()),('Jacobi',lambda v:v/np.diag(A)),('ILU(0)',ip)]}
with (OUT/'gmres_example_data.csv').open('w',encoding='utf-8-sig',newline='') as f:
 wr=csv.writer(f);wr.writerow(['method','inner_step','true_relative_residual']);[wr.writerow([name,i,v]) for name,(hs,e) in results.items() for i,v in enumerate(hs)]
(OUT/'gmres_example_config.json').write_text(json.dumps({'N':N,'restart':20,'rtol':1e-8,'max_inner':200,'matrix':'8x8 index grid, diag 4.5, offdiag -0.7,-1.3,-0.9,-1.1; row scale logspace(-1,1,N)','xstar':'sin(arange(N)+1)','results':{n:{'steps':len(h)-1,'final_residual':h[-1],'relative_error':e} for n,(h,e) in results.items()}},ensure_ascii=False,indent=2),encoding='utf-8')
start(10,'Ví dụ tính toán: so sánh ba cấu hình','Dữ liệu tính thực trên hệ tự sinh N = 64, GMRES(20), float64; dung sai phần dư thực 10⁻⁸.')
xx,yy,pw,ph=88,228,510,195;maxx=max(len(h)-1 for h,e in results.values());maxx=max(20,math.ceil(maxx/20)*20)
c.setStrokeColor(HexColor(INK));c.line(xx,yy,xx+pw,yy);c.line(xx,yy,xx,yy+ph)
for tick in [0,-2,-4,-6,-8]:
 py=yy+(tick+9)/9*ph;c.setStrokeColor(HexColor('#D8E2EC'));c.line(xx,py,xx+pw,py);text(44,py-4,f'10^{tick}',10)
for t in range(0,maxx+1,20):text(xx+pw*t/maxx-5,yy-18,str(t),10)
text(xx+180,190,'Số bước Arnoldi',11)
for (name,(hs,e)),col in zip(results.items(),[BLUE,ORANGE,TEAL]):
 c.setStrokeColor(HexColor(col));c.setLineWidth(1.8);p=c.beginPath()
 for i,v in enumerate(hs):
  px=xx+pw*i/maxx;py=yy+(max(-9,math.log10(max(v,1e-16)))+9)/9*ph
  if i==0:p.moveTo(px,py)
  else:p.lineTo(px,py)
 c.drawPath(p)
 idx=list(results).index(name);text(620,400-idx*60,name,11,col,True);text(620,382-idx*60,f'{len(hs)-1} bước; r = {hs[-1]:.1e}',10)
text(90,433,'Phần dư thực tương đối (thang log)',10,MUTED)
end(['Hệ không đối xứng, chéo trội trước scaling; các hàng được nhân hệ số từ 0.1 đến 10.','Đây là ví dụ nhỏ minh họa, không chứng minh ILU luôn tốt nhất; chưa đo thời gian.','Minh họa cách báo cáo dữ liệu; CSV và cấu hình được lưu kèm.'],'SCI')

start(11,'Hình tham khảo: phần dư và sai số nghiệm','Trích riêng đồ thị trong trang 2 của bài giảng KTH; giữ nguyên đường cong và nhãn gốc.')
c.drawImage(str(IMG/'11_kth_residual_error.png'),75,200,width=350,height=220,preserveAspectRatio=True,anchor='c',mask='auto')
box(485,310,290,105,'Đường đỏ: chuẩn phần dư<br/>Đường xanh: chuẩn sai số nghiệm<br/>Trục tung dùng thang logarithm.',BLUE,13)
box(485,205,290,80,'Hai đại lượng liên quan,<br/>nhưng không đồng nhất.',ORANGE,14)
end(['Đồ thị nguồn dùng chuẩn tuyệt đối; không phải đồ thị tương đối của trang trước.','Quan hệ với số điều kiện giải thích vì sao phần dư nhỏ chưa bảo đảm sai số nhỏ.','Giới thiệu thước đo chất lượng nghiệm và lý do dùng hai đại lượng.'],'KTH',False)

start(12,'Nguồn hình và cách sử dụng','Các trang 1-10 là hình tự dựng; trang 11 là hình tham khảo đã cắt từ nguồn học thuật.')
y=423
for key,(title,url) in SOURCES.items():
 text(48,y,key,11,BLUE,True);para(100,y+10,680,title,11);text(100,y-20,url,8,MUTED);c.linkURL(url,(100,y-25,790,y-10));y-=46
end(['Mỗi trang tương ứng một PNG trong thư mục gmres_images; sơ đồ PDF giữ nét vector.','Khi sử dụng hình trích từ KTH, giữ thông tin tác giả và nguồn; kiểm tra quyền nếu công bố lại.','Đọc hiểu, làm dàn ý và chuẩn bị slide; hình tính toán chỉ là thí nghiệm minh họa.'],'NET')
c.save()

# Render final PDF, save separate images and a contact sheet for visual QA.
doc=pdfium.PdfDocument(str(PDF));thumbs=[]
for i in range(len(doc)):
 im=doc[i].render(scale=1.6).to_pil().convert('RGB');im.save(IMG/f'{i+1:02d}_gmres_page.png')
 thumb=im.copy();thumb.thumbnail((505,357));thumbs.append(thumb)
sheet=Image.new('RGB',(1010,357*6),'#dce3eb')
for i,t in enumerate(thumbs):sheet.paste(t,((i%2)*505,(i//2)*357))
sheet.save(TMP/'gmres_contact_sheet.jpg')
print(json.dumps({'pdf':str(PDF),'pages':len(doc),'results':{k:len(v[0])-1 for k,v in results.items()}},ensure_ascii=True))
