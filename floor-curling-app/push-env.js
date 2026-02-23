const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...values] = line.split('=');
        const value = values.join('=').trim().replace(/^"|"$/g, '');
        if (key && value) {
            console.log(`Adding ${key}...`);
            try {
                // Remove existing first to avoid errors (ignore if it doesn't exist)
                try { execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' }); } catch (e) { }

                // Add new value
                execSync(`npx vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
                console.log(`Successfully added ${key}`);
            } catch (err) {
                console.error(`Failed to add ${key}`);
            }
        }
    }
}
