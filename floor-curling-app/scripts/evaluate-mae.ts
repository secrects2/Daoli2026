/**
 * ============================================================================
 * 學術級誤差評估腳本 (Ground Truth Validation - MAE Evaluation)
 * ============================================================================
 * 
 * 測試方法：
 * 比較系統(AI Vision)輸出的測試數據與 Ground Truth (例如 Vicon 光學動捕系統)
 * 計算 Mean Absolute Error (MAE)，以驗證系統是否達到了嚴謹的醫療/學術標準。
 * 
 * 執行指令:
 * npx ts-node scripts/evaluate-mae.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 定義資料結構
interface TimeSeriesData {
    timestamp_ms: number;
    elbow_rom_deg: number;
    trunk_stability_deg: number;
}

/**
 * 模擬讀取 CSV，這裡為了自給自足的測試，直接建立 Mock Data
 * 在實際學術環境中，請替換為 `csv-parse` 讀取 Vicon 真實匯出資料。
 */
function generateMockData(frameCount: number, noiseLevel: number, timeShift: number = 0): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    for (let i = 0; i < frameCount; i++) {
        const t = (i * 33) + timeShift; // 30 fps

        // 模擬一個丟球動作的光滑曲線
        const baseElbow = 90 + 40 * Math.sin(i * 0.1);
        const baseTrunk = 5 + 10 * Math.cos(i * 0.05);

        data.push({
            timestamp_ms: t,
            elbow_rom_deg: baseElbow + (Math.random() - 0.5) * noiseLevel,
            trunk_stability_deg: baseTrunk + (Math.random() - 0.5) * noiseLevel * 0.5
        });
    }
    return data;
}

/**
 * 時間軸對齊 (Dynamic Time Warping 簡化版或線性插值)
 * 由於 Vicon 和 Webcam 的幀率(FPS) 與啟動時間往往不完全一致，
 * 需要對預測資料進行線性內插以對齊 Ground Truth 的時間戳記。
 */
function alignTimeSeries(gt: TimeSeriesData[], pred: TimeSeriesData[]): TimeSeriesData[] {
    const alignedPred: TimeSeriesData[] = [];

    for (const gtPoint of gt) {
        // 尋找最近的兩個 pred 點進行插值
        const tTarget = gtPoint.timestamp_ms;

        let p1 = pred[0];
        let p2 = pred[pred.length - 1];

        // 簡單尋找區間
        for (let i = 0; i < pred.length - 1; i++) {
            if (pred[i].timestamp_ms <= tTarget && pred[i + 1].timestamp_ms >= tTarget) {
                p1 = pred[i];
                p2 = pred[i + 1];
                break;
            }
        }

        // 線性插值 (Linear Interpolation)
        let ratio = 0;
        if (p2.timestamp_ms !== p1.timestamp_ms) {
            ratio = (tTarget - p1.timestamp_ms) / (p2.timestamp_ms - p1.timestamp_ms);
        }

        // 為了避免外插過遠，限制 ratio 在 0~1 之間
        ratio = Math.max(0, Math.min(1, ratio));

        alignedPred.push({
            timestamp_ms: tTarget,
            elbow_rom_deg: p1.elbow_rom_deg + (p2.elbow_rom_deg - p1.elbow_rom_deg) * ratio,
            trunk_stability_deg: p1.trunk_stability_deg + (p2.trunk_stability_deg - p1.trunk_stability_deg) * ratio,
        });
    }

    return alignedPred;
}

/**
 * 計算 MAE (Mean Absolute Error) 
 */
function calculateMAE(gt: TimeSeriesData[], pred: TimeSeriesData[]) {
    if (gt.length !== pred.length || gt.length === 0) {
        throw new Error("Data length mismatch or empty data.");
    }

    let sumElbowError = 0;
    let sumTrunkError = 0;
    let maxElbowError = 0;
    let maxTrunkError = 0;

    for (let i = 0; i < gt.length; i++) {
        const errElbow = Math.abs(gt[i].elbow_rom_deg - pred[i].elbow_rom_deg);
        const errTrunk = Math.abs(gt[i].trunk_stability_deg - pred[i].trunk_stability_deg);

        sumElbowError += errElbow;
        sumTrunkError += errTrunk;

        if (errElbow > maxElbowError) maxElbowError = errElbow;
        if (errTrunk > maxTrunkError) maxTrunkError = errTrunk;
    }

    const n = gt.length;
    return {
        mae_elbow: sumElbowError / n,
        max_err_elbow: maxElbowError,
        mae_trunk: sumTrunkError / n,
        max_err_trunk: maxTrunkError
    };
}

// ============================================================================
// 主程式執行
// ============================================================================
function runEvaluation() {
    console.log("==================================================");
    console.log(" 醫療級指標 MAE 誤差分析腳本啟動 (Medical Validation) ");
    console.log("==================================================\n");

    // 1. 載入假資料 (若有真實資料請換成 readFileSync)
    const frameCount = 300; // 約 10 秒

    // Ground Truth 通常非常精確，雜訊低
    const groundTruthData = generateMockData(frameCount, 0.5);

    // AI 預測資料可能帶有比較大的雜訊，且時間可能稍微平移 15 毫秒
    console.log("生成模擬測試資料中...");
    const aiPredictionData = generateMockData(frameCount, 5.0, 15);

    // 2. 時間軸對齊
    console.log("進行時間序列對齊 (Time-Series Alignment)...");
    const alignedPrediction = alignTimeSeries(groundTruthData, aiPredictionData);

    // 3. 計算 MAE
    console.log("計算平均絕對誤差 (MAE) 中...\n");
    const result = calculateMAE(groundTruthData, alignedPrediction);

    // 4. 產出報告
    console.log("==================================================");
    console.log(" 驗證報告 (Validation Report) ");
    console.log("==================================================");
    console.log(`總比對影格數: ${groundTruthData.length} frames`);
    console.log(`\n[ 手肘伸展度 (Elbow ROM) ]`);
    console.log(`  - 平均絕對誤差 (MAE): ${result.mae_elbow.toFixed(2)} °`);
    console.log(`  - 最大極值誤差 (Max): ${result.max_err_elbow.toFixed(2)} °`);

    console.log(`\n[ 軀幹穩定度 (Trunk Tilt) ]`);
    console.log(`  - 平均絕對誤差 (MAE): ${result.mae_trunk.toFixed(2)} °`);
    console.log(`  - 最大極值誤差 (Max): ${result.max_err_trunk.toFixed(2)} °`);
    console.log("==================================================\n");

    // 判定是否符合公認的臨床允許誤差 (< 5度)
    const passed = result.mae_elbow < 5.0 && result.mae_trunk < 5.0;
    if (passed) {
        console.log("✅ 結論: 誤差小於 5°，符合醫療級臨床動捕標準可以接受的範圍。");
    } else {
        console.log("❌ 結論: 誤差大於 5°，請重新檢查 Butterworth 低通濾波器參數或 Aspect-Ratio 轉換。");
    }
}

// 執行
runEvaluation();
