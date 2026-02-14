# 專利申請支援文件：地板滾球 AI 智慧分析系統
# Patent Application Support: Boccia AI Analysis System

## 1. 系統流程圖 (System Flowchart)

本系統採集長輩投擲過程的影像數據，經由 MediaPipe 骨架追蹤，即時計算三大關鍵指標，並透過「智慧診斷邏輯 (The Brain)」輸出即時回饋與復健建議。

```mermaid
graph TD
    A[影像輸入<br>Webcam Input] --> B[AI 骨架節點偵測<br>MediaPipe Pose]
    B --> C{數據品質檢核?}
    C -->|No| A
    C -->|Yes| D[特徵提取 & 指標計算]
    
    subgraph Metrics [關鍵指標運算模組]
    D --> E[A. 手肘伸展度<br>Elbow ROM]
    D --> F[B. 軀幹穩定度<br>Trunk Stability]
    D --> G[C. 出手速度<br>Release Velocity]
    end
    
    subgraph Brain [智慧診斷核心 The Brain]
    E --> H{規則配對 Logic Rules}
    F --> H
    G --> H
    
    H -->|軀幹傾斜 > 15°| I[🔴 安全警示<br>跌倒風險偵測]
    H -->|ROM < 160°| J[🟠 張力異常<br>Spasticity Alert]
    H -->|穩定且速度快| K[🟢 優良動作<br>Good Shot]
    end
    
    I --> L[即時視覺回饋<br>Visual Feedback]
    J --> L
    K --> L
    
    L --> M[數據存檔與閉環<br>Training Session DB]
    M --> N[長期趨勢分析<br>Long-term Analysis]

    subgraph Optimize [坐姿優化識別 Sitting Optimization]
    O[排除下肢雜訊] --> P[專注上半身 Up-Body ROI]
    P --> B
    end
```

---

## 2. 關鍵演算法公式 (Key Algorithms)

### A. 手肘伸展度 (Elbow Extension / ROM)
**目的**：量化手臂伸展能力，偵測肌張力異常。
**公式**：計算 Shoulder-Elbow-Wrist 三點夾角。

$$
\theta_{Elbow} = \arccos\left(\frac{AB \cdot BC}{|AB| |BC|}\right) \times \frac{180}{\pi}
$$

*   **節點 (MediaPipe ID)**:
    *   $A$: Right Shoulder (12)
    *   $B$: Right Elbow (14)
    *   $C$: Right Wrist (16)
*   **判斷閾值**:
    *   $\theta < 160^\circ$ : 判定為未完全伸展 (Potential Spasticity)。

### B. 軀幹穩定度 (Trunk Stability)
**目的**：偵測核心肌群無力或身體代償歪斜，預防跌倒。
**公式**：計算左右肩膀連線與水平線之夾角。

$$
\theta_{Trunk} = \left| \arctan\left(\frac{y_{Left} - y_{Right}}{x_{Left} - x_{Right}}\right) \times \frac{180}{\pi} \right|
$$

*   **節點 (MediaPipe ID)**:
    *   $Left$: Left Shoulder (11)
    *   $Right$: Right Shoulder (12)
*   **判斷閾值**:
    *   $\theta > 15^\circ$ : 判定為軀幹不穩 (Instability Alert)。

### C. 出手速度 (Release Velocity)
**目的**：量化肌肉爆發力 (Power)。
**公式**：計算手腕節點在單位時間內的位移量。

$$
V = \frac{\sqrt{(x_t - x_{t-1})^2 + (y_t - y_{t-1})^2}}{\Delta t}
$$

*   **變數**:
    *   $(x_t, y_t)$: 當前幀手腕 (Wrist 16) 座標
    *   $(x_{t-1}, y_{t-1})$: 上一幀手腕座標
    *   $\Delta t$: 幀間隔時間 (Time delta)

---

## 3. 系統方塊圖 (System Block Diagram)

此圖用於說明本發明之系統架構與各模組之連接關係。

```mermaid
graph LR
    subgraph Client [用戶端裝置 Client Device]
        Cam[影像擷取單元<br>Camera Module] --> Proc[中央處理單元<br>Processing Unit]
        UI[使用者介面<br>UI/Display] <--> Proc
    end

    subgraph Cloud [雲端伺服器 Server]
        DB[(資料庫<br>Database)] <--> API[應用程式介面<br>API Gateway]
    end

    subgraph AI_Core [AI 運算核心]
        Pre[預處理模組<br>Preprocessing] --> MP[骨架追蹤模組<br>MediaPipe Pose]
        MP --> Feat[特徵提取模組<br>Feature Extraction]
        Feat --> Diag[智慧診斷模組<br>Diagnostic Engine]
    end

    Proc <--> API
    Proc <--> AI_Core
```

---

## 4. 台灣發明專利申請備忘錄 (Taiwan Patent Application Notes)

根據經濟部智慧財產局 (TIPO) 之規範，申請軟體/AI 相關發明專利時，請務必準備以下資料：

### A. 必要文件
1.  **專利說明書 (Specification)**：須詳細揭露技術內容，使該領域技術人員能據以實施。
2.  **申請專利範圍 (Claims)**：界定權利範圍，建議包含「方法項」與「系統項」。
3.  **摘要 (Abstract)**：簡要說明發明重點。
4.  **圖式 (Drawings)**：包含上述之「流程圖」與「方塊圖」。

### B. 軟體專利特別規範
*   **技術性 (Technical Character)**：必須強調演算法如何與硬體資源結合（例如：利用攝像頭擷取、處理器運算、螢幕顯示），而非僅是抽象的數學公式。
*   **具體實施方式**：
    *   **輸入**：影像數據 (RGB Frames)。
    *   **處理**：骨架節點座標轉換、幾何角度計算、物理速度推導。
    *   **輸出**：醫療復健數據 (ROM 角度、穩定度警示)。
*   **進步性 (Inventive Step)**：強調本發明與既有技術之差異（例如：針對「亞健康長輩坐姿」的優化演算法、即時視覺回饋機制）。
