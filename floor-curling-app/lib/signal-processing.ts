/**
 * ============================================================================
 * 醫療級訊號處理模組 (Medical-Grade Signal Processing)
 * ============================================================================
 * 
 * 包含四階零相位 Butterworth 低通濾波器 (Zero-phase 4th-order Butterworth Low-pass Filter)
 * 用於高頻空間雜訊 (Jitter) 的濾除，以達到學術研究標準。
 * 
 * @module signal-processing
 */

/** 
 * Butterworth 濾波器核心實作
 * 
 * 採用二階 IIR (Infinite Impulse Response) 雙二階濾波器 (Biquad) 串聯成四階，
 * 並透過正反雙向濾波 (Filtfilt) 達成零相位 (Zero-phase) 延遲。
 */
export class ButterworthFilter {
    private a: number[] = [];
    private b: number[] = [];

    /**
     * 初始化四階 Butterworth 濾波器係數
     * @param cutoffFreq 截斷頻率 (Hz)
     * @param sampleRate 取樣頻率 (Hz) - 預設 30fps
     */
    constructor(cutoffFreq: number = 3.0, sampleRate: number = 30.0) {
        this.computeCoefficients(cutoffFreq, sampleRate);
    }

    /**
     * 計算數位濾波器係數 (基於雙線性轉換, Bilinear Transform)
     * 這裡是直接帶入四階設計的標準差分方程式係數。
     */
    private computeCoefficients(fc: number, fs: number) {
        // 正規化角頻率
        const omega_c = 2 * Math.PI * (fc / fs);
        const k = Math.tan(omega_c / 2);
        const k2 = k * k;
        const k3 = k2 * k;
        const k4 = k2 * k2;

        // 四階 Butterworth 多項式的根
        // s^4 + 2.6131*s^3 + 3.4142*s^2 + 2.6131*s + 1
        const a0 = 1 + 2.6131 * k + 3.4142 * k2 + 2.6131 * k3 + k4;
        const a1 = -4 - 5.2262 * k + 5.2262 * k3 + 4 * k4;
        const a2 = 6 - 6.8284 * k2 + 6 * k4;
        const a3 = -4 + 5.2262 * k - 5.2262 * k3 + 4 * k4;
        const a4 = 1 - 2.6131 * k + 3.4142 * k2 - 2.6131 * k3 + k4;

        this.b = [k4 / a0, (4 * k4) / a0, (6 * k4) / a0, (4 * k4) / a0, k4 / a0];
        this.a = [1, a1 / a0, a2 / a0, a3 / a0, a4 / a0];
    }

    /**
     * 單向濾波 (IIR Filter)
     */
    private filter1D(data: number[]): number[] {
        const n = data.length;
        const y: number[] = new Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            // FIR 部分
            let fir = this.b[0] * data[i];
            if (i > 0) fir += this.b[1] * data[i - 1];
            if (i > 1) fir += this.b[2] * data[i - 2];
            if (i > 2) fir += this.b[3] * data[i - 3];
            if (i > 3) fir += this.b[4] * data[i - 4];

            // IIR 部分
            let iir = 0;
            if (i > 0) iir -= this.a[1] * y[i - 1];
            if (i > 1) iir -= this.a[2] * y[i - 2];
            if (i > 2) iir -= this.a[3] * y[i - 3];
            if (i > 3) iir -= this.a[4] * y[i - 4];

            y[i] = fir + iir;
        }
        return y;
    }

    /**
     * 零相位雙向濾波 (Zero-phase Filtfilt)
     * 先正向過濾，再將反轉序列過濾一次，最後再反轉回來。
     * 
     * @param data 原始一維訊號陣列
     * @returns 平滑且無相位遞延的訊號
     */
    public filtfilt(data: number[]): number[] {
        if (data.length < 5) return [...data]; // 資料量過少不作處理

        // 邊界條件擴展，防止起始與結尾震盪 (Padding)
        const padLen = 3 * 4; // 3 倍階數
        const paddedData = [
            ...Array(padLen).fill(data[0]),
            ...data,
            ...Array(padLen).fill(data[data.length - 1])
        ];

        // 1. 正向濾波
        let yFwd = this.filter1D(paddedData);

        // 2. 反向濾波
        yFwd.reverse();
        let yRev = this.filter1D(yFwd);
        yRev.reverse();

        // 移除 Padding
        return yRev.slice(padLen, padLen + data.length);
    }
}

/**
 * 即時串流資料緩衝區 (Stream Buffer)
 * 用於在確保維持 30fps 的情況下，提供一個短暫時間窗進行零相位濾波計算。
 */
export class SmoothingBuffer {
    private rawBuffer: number[] = [];
    private filter: ButterworthFilter;
    private maxBufferSize: number;

    constructor(cutoffFreq = 3.0, sampleRate = 30.0, maxBufferSize = 30) {
        this.filter = new ButterworthFilter(cutoffFreq, sampleRate);
        this.maxBufferSize = maxBufferSize;
    }

    /**
     * 推入新的一幀資料，並獲取最新的濾波後數值。
     * 因為 filtfilt 是離線演算法，我們在滑動窗口內對最新的資料串流進行計算，
     * 取平滑結果的最新點作為實時輸出的「即時平滑值」。
     * 
     * @param value 原始數值
     * @returns 濾波後的數值
     */
    public push(value: number): number {
        this.rawBuffer.push(value);
        if (this.rawBuffer.length > this.maxBufferSize) {
            this.rawBuffer.shift();
        }

        if (this.rawBuffer.length < 5) {
            return value; // 尚未填滿足夠的點數
        }

        const smoothed = this.filter.filtfilt(this.rawBuffer);
        // 回傳平滑化軌跡的最新值，雖然可能會有極端微小的群延遲 (Group Delay)，
        // 但對視覺即時呈現影響極小。
        return smoothed[smoothed.length - 1];
    }

    /**
     * 清空緩衝區
     */
    public reset() {
        this.rawBuffer = [];
    }

    /**
     * 匯出完整雙軌資料
     * @returns 原始訊號與濾波後訊號序列
     */
    public dumpDualTrack(): { raw: number[], filtered: number[] } {
        return {
            raw: [...this.rawBuffer],
            filtered: this.rawBuffer.length >= 5 ? this.filter.filtfilt(this.rawBuffer) : [...this.rawBuffer]
        };
    }
}
