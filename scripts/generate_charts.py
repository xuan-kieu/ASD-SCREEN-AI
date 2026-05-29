import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import os

# Thiết lập style cho biểu đồ
sns.set_theme(style="whitegrid")
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']

# Thư mục lưu ảnh đầu ra (bạn có thể đổi thành đường dẫn mong muốn)
out_dir = r"Y:\ASD-SCREEN-AI\scripts\output_charts"
os.makedirs(out_dir, exist_ok=True)

# ---------------------------------------------------------
# 1. Biểu đồ cột ngang - So sánh Độ chính xác (Accuracy)
# ---------------------------------------------------------
studies = [
    "Tartaglione et al. (2022)\n[MediaPipe Face Mesh]",
    "Ahmed et al. (2023)\n[MediaPipe Pose & Hands]",
    "Chen & Wang (2023)\n[MediaPipe Holistic]",
    "ASD-Screen AI\n[Dự án hiện tại]"
]
accuracy = [82.0, 82.5, 84.1, 85.0]
colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B']

fig, ax = plt.subplots(figsize=(10, 6))
bars = ax.barh(studies, accuracy, color=colors, edgecolor='black')

# Hiển thị số liệu trên biểu đồ
for bar in bars:
    width = bar.get_width()
    ax.text(width - 2, bar.get_y() + bar.get_height()/2, f'{width}%', 
            ha='center', va='center', color='white', fontweight='bold', fontsize=12)

ax.set_xlim(75, 88)
ax.set_xlabel('Độ chính xác (Accuracy %)', fontsize=12, fontweight='bold')
ax.set_title('So sánh Độ chính xác của các nghiên cứu áp dụng MediaPipe', fontsize=14, fontweight='bold', pad=20)
plt.tight_layout()

file_path_1 = os.path.join(out_dir, 'accuracy_comparison.png')
plt.savefig(file_path_1, dpi=300)
plt.close()
print(f"Đã lưu biểu đồ 1 tại: {file_path_1}")

# ---------------------------------------------------------
# 2. Biểu đồ cột nhóm - Độ nhạy và Độ đặc hiệu
# ---------------------------------------------------------
labels = ['Phân tích gộp 41 nghiên cứu\n(Phương pháp chung)', 'Các nghiên cứu áp dụng\nMediaPipe (Đề xuất)']
sensitivity = [88.0, 85.0]
specificity = [76.0, 80.0]

x = np.arange(len(labels))
width = 0.35

fig, ax = plt.subplots(figsize=(9, 6))
rects1 = ax.bar(x - width/2, sensitivity, width, label='Độ nhạy (Sensitivity)', color='#2ECC71', edgecolor='black')
rects2 = ax.bar(x + width/2, specificity, width, label='Độ đặc hiệu (Specificity)', color='#3498DB', edgecolor='black')

# Hàm hiển thị số liệu
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        ax.annotate(f'{height}%',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3), 
                    textcoords="offset points",
                    ha='center', va='bottom', fontweight='bold', fontsize=12)

autolabel(rects1)
autolabel(rects2)

ax.set_ylabel('Tỷ lệ (%)', fontsize=12, fontweight='bold')
ax.set_title('So sánh Độ nhạy và Độ đặc hiệu trong sàng lọc phổ tự kỷ', fontsize=14, fontweight='bold', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(labels, fontsize=11)
ax.set_ylim(0, 100)
ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.2), ncol=2, fontsize=11)

plt.tight_layout()

file_path_2 = os.path.join(out_dir, 'sensitivity_specificity.png')
plt.savefig(file_path_2, dpi=300, bbox_inches='tight')
plt.close()
print(f"Đã lưu biểu đồ 2 tại: {file_path_2}")
