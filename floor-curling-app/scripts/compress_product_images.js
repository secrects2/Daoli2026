const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = 'C:\\Users\\secre\\.gemini\\antigravity\\brain\\1874c9f5-486b-4336-a9ef-2198b36c0070';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'products');

const images = [
    { src: 'support_chair_1771772473314.png', dest: 'support-chair.webp' },
    { src: 'boccia_ramp_1771772559470.png', dest: 'boccia-ramp.webp' },
    { src: 'hard_boccia_balls_1771772589531.png', dest: 'hard-boccia-balls.webp' },
    { src: 'ucii_calcium_1771772614198.png', dest: 'ucii-calcium.webp' },
    { src: 'omega3_fish_oil_1771772691241.png', dest: 'omega3-fish-oil.webp' },
    { src: 'bcaa_protein_1771772715805.png', dest: 'bcaa-protein.webp' },
];

async function run() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const img of images) {
        const srcPath = path.join(BRAIN_DIR, img.src);
        const destPath = path.join(OUTPUT_DIR, img.dest);

        if (!fs.existsSync(srcPath)) {
            console.log(`skip ${img.src}`);
            continue;
        }

        const originalSize = fs.statSync(srcPath).size;
        await sharp(srcPath)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(destPath);

        const newSize = fs.statSync(destPath).size;
        const ratio = Math.round((1 - newSize / originalSize) * 100);
        console.log(`✅ ${img.dest}: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (${ratio}% smaller)`);
    }

    // 刪除之前的 PNG 版本
    const pngFiles = ['support-chair.png'];
    for (const f of pngFiles) {
        const p = path.join(OUTPUT_DIR, f);
        if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`🗑️ 刪除舊版 ${f}`); }
    }

    console.log('✅ Done!');
}
run();
