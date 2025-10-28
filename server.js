const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

const dataDir = process.argv[2] || '.';

const lastPatternCodes = new Map();

app.post('/sync', async (req, res) => {
    try {
        await fs.mkdir(dataDir, { recursive: true });

        // Find the userPatterns key
        const patternsKey = Object.keys(req.body).find(key => 
            key.includes('userPatterns')
        );

        if (!patternsKey) {
            return res.json({ success: false, message: 'No patterns found' });
        }

        // Parse the JSON string from localStorage
        const patternsData = JSON.parse(req.body[patternsKey]);

        // Save each pattern to its own file
        let written = 0;
        for (const [patternId, pattern] of Object.entries(patternsData)) {
            const filename = `${patternId}.st`;
            const filepath = path.join(dataDir, filename);

            var previous = lastPatternCodes.get(patternId);
            if (!previous) {
                previous = await fs.readFile(filepath, 'utf-8').catch(() => null);
                lastPatternCodes.set(patternId, previous);
            }
            const content = pattern.code;
            if (previous === content) {
                continue;
            }

            console.log(`Pattern ${patternId} updated`);
            await fs.writeFile(filepath, content, 'utf-8');
            lastPatternCodes.set(patternId, content);
            written++;
        }

        res.json({ 
            success: true, 
            count: Object.keys(patternsData).length,
            written
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(13121, () => console.log('Syncing patterns to ', dataDir));
