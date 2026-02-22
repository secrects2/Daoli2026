# 關鍵演算法公式 — AI 3D 骨架追蹤復健分析系統

> 本文件供專利事務所撰寫說明書使用
> 原始碼位置：[BocciaCam.tsx](file:///c:/Users/secre/.gemini/antigravity/scratch/floor-curling-app/components/ai/BocciaCam.tsx)

---

## 一、使用的骨架節點 (MediaPipe Pose Landmark IDs)

| 節點 ID | 名稱 | 用途 |
|---------|------|------|
| **11** | 左肩 (LEFT_SHOULDER) | 軀幹傾斜計算 |
| **12** | 右肩 (RIGHT_SHOULDER) | 軀幹傾斜 + ROM 起點 |
| **13** | 左肘 (LEFT_ELBOW) | — |
| **14** | 右肘 (RIGHT_ELBOW) | ROM 頂點（角度量測中心）|
| **15** | 左腕 (LEFT_WRIST) | — |
| **16** | 右腕 (RIGHT_WRIST) | ROM 終點 + 速度追蹤 |
| **23** | 左髖 (LEFT_HIP) | 骨架繪製 |
| **24** | 右髖 (RIGHT_HIP) | 骨架繪製 |

每個節點由 MediaPipe 輸出 **四維資料**：

$$
\text{Landmark} = (x,\ y,\ z,\ \text{visibility})
$$

- $x, y$：歸一化螢幕座標 $\in [0, 1]$
- $z$：深度座標（以髖部中點為原點，與 $x$ 同尺度）
- $\text{visibility}$：可見度信心值 $\in [0, 1]$

---

## 二、指標 A：手肘伸展度 ROM（3D 點積法）

### 目的
量測「**肩膀 → 肘部 → 手腕**」三點的真實空間夾角，判斷手臂是否完全伸展。

### 使用節點
- $A$ = 右肩 (ID: 12)
- $B$ = 右肘 (ID: 14)　← 角度頂點
- $C$ = 右腕 (ID: 16)

### 公式

**步驟 1**：建立 3D 向量

$$
\vec{BA} = A - B = (A_x - B_x,\ A_y - B_y,\ A_z - B_z)
$$

$$
\vec{BC} = C - B = (C_x - B_x,\ C_y - B_y,\ C_z - B_z)
$$

**步驟 2**：計算點積與向量長度

$$
\vec{BA} \cdot \vec{BC} = BA_x \cdot BC_x + BA_y \cdot BC_y + BA_z \cdot BC_z
$$

$$
|\vec{BA}| = \sqrt{BA_x^2 + BA_y^2 + BA_z^2}
$$

$$
|\vec{BC}| = \sqrt{BC_x^2 + BC_y^2 + BC_z^2}
$$

**步驟 3**：求解夾角

$$
\theta_{ROM} = \cos^{-1}\!\left(\frac{\vec{BA} \cdot \vec{BC}}{|\vec{BA}| \times |\vec{BC}|}\right) \times \frac{180°}{\pi}
$$

### 臨床閾值

| 狀態 | 條件 | 意義 |
|------|------|------|
| ✅ 手臂完全伸展 | $\theta_{ROM} \geq 160°$ | 正常活動範圍 |
| ⚠️ 伸展受限 | $\theta_{ROM} < 160°$ | 可能肌肉張力過高 (Spasticity) |

### 技術優勢
> 傳統 2D 方法使用 $\text{atan2}$ 差值，在鏡頭有角度時會產生投影誤差。
> **本 3D 點積法直接在空間中計算夾角，完全排除鏡頭視角干擾。**

---

## 三、指標 B：軀幹穩定度（3D 水平面投影法）

### 目的
量測「**左右肩膀連線**」相對於水平面的真實傾斜角度，偵測跌倒風險。

### 使用節點
- $A$ = 左肩 (ID: 11)
- $B$ = 右肩 (ID: 12)

### 公式

**步驟 1**：計算肩膀連線的 3D 方向向量

$$
\Delta x = B_x - A_x \quad,\quad \Delta y = B_y - A_y \quad,\quad \Delta z = B_z - A_z
$$

**步驟 2**：計算水平面上的投影長度

$$
L_{horizontal} = \sqrt{\Delta x^2 + \Delta z^2}
$$

> $L_{horizontal}$ 是肩膀連線在「**x-z 水平面**」上的投影，排除了鏡頭深度角度造成的假陽性。

**步驟 3**：求解傾斜角

$$
\theta_{tilt} = \left|\arctan\!\left(\frac{\Delta y}{L_{horizontal}}\right)\right| \times \frac{180°}{\pi}
$$

### 臨床閾值

| 狀態 | 條件 | 意義 |
|------|------|------|
| ✅ 軀幹穩定 | $\theta_{tilt} \leq 15°$ | 安全範圍 |
| ⚠️ 跌倒風險 | $\theta_{tilt} > 15°$ | 身體明顯傾斜 (Fall Risk) |

### 技術優勢
> 傳統 2D 方法使用 $\text{atan2}(\Delta y, \Delta x)$，當鏡頭從側面拍攝（$z$ 軸差異大）時，
> 會將深度差異誤判為左右傾斜。
> **本方法使用 x-z 平面投影，僅量測真實的垂直傾斜分量。**

---

## 四、指標 C：出手速度（3D 歐式距離法）

### 目的
追蹤手腕在連續幀之間的 3D 位移速度，反映投球的爆發力。

### 使用節點
- $W_t$ = 右腕在當前幀 (ID: 16)
- $W_{t-1}$ = 右腕在前一幀 (ID: 16)

### 公式

**步驟 1**：計算 3D 位移距離

$$
d_{3D} = \sqrt{(W_{t,x} - W_{t-1,x})^2 + (W_{t,y} - W_{t-1,y})^2 + (W_{t,z} - W_{t-1,z})^2}
$$

**步驟 2**：計算時間差（秒）

$$
\Delta t = \frac{t_{current} - t_{previous}}{1000}
$$

**步驟 3**：計算歸一化速度

$$
V = \text{round}\!\left(\frac{d_{3D}}{\Delta t} \times 100\right)
$$

### 臨床閾值

| 狀態 | 條件 | 意義 |
|------|------|------|
| ✅ 發力充足 | $V > 50$ | 具備良好爆發力 |
| ⚠️ 速度偏慢 | $V < 30$ | 建議爆發力訓練 |

### 技術優勢
> 2D 方法僅計算螢幕平面的位移，忽略了手腕「向前推出」(z 軸) 的運動。
> **3D 距離包含深度方向的全部運動量，更精確反映實際出手力道。**

---

## 五、The Brain — 優先級診斷規則引擎

```
IF  θ_tilt > 15°     → ⚠️ 核心穩定度警示 (Fall Risk)
ELIF θ_ROM < 160°     → 💪 上肢伸展受限 (Spasticity)
ELIF V < 30           → ⚡ 發力速度偏慢
ELIF ROM≥160 & V>50   → ✅ 動作表現優異
ELSE                  → 🔵 動作穩定，準備投球
```

> 規則按**安全性 → 功能性 → 表現性**的臨床優先級排列，
> 確保系統優先通報最危急的狀況。

---

## 六、安全降級機制

所有 3D 公式使用 `(z || 0)` 容錯設計：

$$
z_{safe} = \begin{cases} z & \text{if MediaPipe 輸出 z 值} \\ 0 & \text{otherwise (降級為 2D)} \end{cases}
$$

這確保在 MediaPipe 未輸出深度資訊的邊緣情況下，系統不會崩潰，而是自動降級為 2D 計算模式。
