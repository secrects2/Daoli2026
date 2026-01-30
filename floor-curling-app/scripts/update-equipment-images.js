const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            }
        });
    }
} catch (e) { }

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Image mapping based on equipment names
const imageMap = {
    'Speed Base': '/images/equipment/speed-base.png',
    'Precision Pusher': '/images/equipment/precision-pusher.png',
    'Power Grip': '/images/equipment/power-grip.png',
    'Blocker Base': '/images/equipment/blocker-base.png'
};

async function updateEquipmentImages() {
    console.log('🖼️ Updating equipment images in database...');

    for (const [name, imageUrl] of Object.entries(imageMap)) {
        const { error } = await supabase
            .from('equipment')
            .update({ image_url: imageUrl })
            .eq('name', name);

        if (error) {
            console.error(`❌ Failed to update ${name}:`, error.message);
        } else {
            console.log(`✅ Updated ${name} -> ${imageUrl}`);
        }
    }

    console.log('\n📋 Verification - Current equipment data:');
    const { data } = await supabase.from('equipment').select('name, image_url, rarity');
    console.table(data);
}

updateEquipmentImages();
