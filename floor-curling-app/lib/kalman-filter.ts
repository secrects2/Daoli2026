/**
 * ============================================================================
 * 深度遮蔽抗干擾追蹤 (Occlusion Handling)
 * ============================================================================
 * 
 * 實作一維等速直線運動 (Constant Velocity) 的 Kalman Filter。
 * 針對座標 X, Y 的追蹤，將會實例化兩個 Kalman Filter 物件分別負責。
 * 
 * 當發生短暫遮蔽（如照護員經過鏡頭 1~2 秒），此濾波器將基於過去的運動狀態
 * （位置與速度）預測畫面上人物的中心點（Bounding Box Center），確保 MediaPipe
 * 骨架丟失時 `SubjectTracker` 依然能維持追蹤鎖定，防止重新捕捉到其他人。
 * 
 * @module kalman-filter
 */

export class KalmanFilter1D {
    // 系統狀態
    // x_k = [position, velocity]^T
    private x: number; // 預估位置
    private v: number; // 預估速度

    // 共變異數矩陣 P
    private p00: number;
    private p01: number;
    private p10: number;
    private p11: number;

    // 系統雜訊共變異數 Q (Process Noise)
    private readonly q_pos: number;
    private readonly q_vel: number;

    // 觀測雜訊共變異數 R (Measurement Noise)
    private readonly r: number;

    /**
     * @param initialPos 初始位置
     * @param initialVel 初始速度
     * @param processNoise 系統雜訊 (較小表示信任物理模型：等速運動)
     * @param measurementNoise 測量雜訊 (越大表示越不信任感測器提供的數據)
     */
    constructor(
        initialPos: number = 0,
        initialVel: number = 0,
        processNoise: number = 1e-3,
        measurementNoise: number = 1e-1
    ) {
        this.x = initialPos;
        this.v = initialVel;

        // 初始不確定性通常設定較大
        this.p00 = 1.0;
        this.p01 = 0.0;
        this.p10 = 0.0;
        this.p11 = 1.0;

        this.q_pos = processNoise;
        this.q_vel = processNoise;
        this.r = measurementNoise;
    }

    /**
     * 更新目標的觀測狀態 (已知測量值的情況)
     * @param dt 與上一次更新的時間差 (秒)
     * @param measurement 感測器 (MediaPipe) 提供的位置測量值
     * @returns 更新後的平滑位置
     */
    public predictAndUpdate(dt: number, measurement: number): number {
        // --- 1. 預測階段 (Predict) ---
        // 狀態轉移方程式: 
        // x_{k|k-1} = x_{k-1} + v_{k-1} * dt
        // v_{k|k-1} = v_{k-1}
        let xp = this.x + this.v * dt;
        let vp = this.v;

        // 共變異數預測: P_{k|k-1} = A * P_{k-1} * A^T + Q
        // 這裡 A = [[1, dt], [0, 1]]
        let pp00 = this.p00 + dt * (this.p10 + this.p01) + dt * dt * this.p11 + this.q_pos;
        let pp01 = this.p01 + dt * this.p11;
        let pp10 = this.p10 + dt * this.p11;
        let pp11 = this.p11 + this.q_vel;

        // --- 2. 更新階段 (Update) ---
        // 卡爾曼增益 (Kalman Gain): K = P_{k|k-1} * H^T * (H * P_{k|k-1} * H^T + R)^{-1}
        // 觀測矩陣 H = [1, 0] (只觀測到位置)
        let s = pp00 + this.r; // 預測誤差
        let k0 = pp00 / s;
        let k1 = pp10 / s;

        // 創新 (Innovation): y = z - H * x_{k|k-1}
        let y = measurement - xp;

        // 狀態更新: x_k = x_{k|k-1} + K * y
        this.x = xp + k0 * y;
        this.v = vp + k1 * y;

        // 共變異數更新: P_k = (I - K * H) * P_{k|k-1}
        this.p00 = (1 - k0) * pp00;
        this.p01 = (1 - k0) * pp01;
        this.p10 = pp10 - k1 * pp00;
        this.p11 = pp11 - k1 * pp01;

        return this.x;
    }

    /**
     * 僅預測，無觀測值輸入 (當發生遮蔽、失去目標時)
     * @param dt 與上一次的時間差 (秒)
     * @returns 預估的未來位置
     */
    public predictOnly(dt: number): number {
        this.x = this.x + this.v * dt;
        // 共變異數隨著預測時間增加而不斷膨脹，代表信心值下降
        this.p00 = this.p00 + dt * (this.p10 + this.p01) + dt * dt * this.p11 + this.q_pos;
        this.p01 = this.p01 + dt * this.p11;
        this.p10 = this.p10 + dt * this.p11;
        this.p11 = this.p11 + this.q_vel;

        return this.x;
    }

    /** 重置狀態 */
    public reset(initialPos: number) {
        this.x = initialPos;
        this.v = 0;
        this.p00 = 1.0;
        this.p01 = 0.0;
        this.p10 = 0.0;
        this.p11 = 1.0;
    }
}
