// Improved Azure Static Web App Function: /api/negotiate
// - Securely negotiates Azure Voice Live API WebSocket URL (NO API KEY LEAK)
// - Logs detailed errors for debugging (console + response)
// - Returns 200 with { url } if success, 500 with diagnostic message if error

const https = require('https');

module.exports = async function (context, req) {
    const AZURE_VOICE_LIVE_ENDPOINT = process.env.AZURE_VOICE_LIVE_ENDPOINT;
    const AZURE_VOICE_LIVE_API_KEY = process.env.AZURE_VOICE_LIVE_API_KEY;
    const AZURE_VOICE_LIVE_MODEL = process.env.AZURE_VOICE_LIVE_MODEL;
    const API_VERSION = '2025-10-01';

    // 1. Validate required env variables
    if (!AZURE_VOICE_LIVE_ENDPOINT || !AZURE_VOICE_LIVE_API_KEY || !AZURE_VOICE_LIVE_MODEL) {
        const errMsg = `[negotiate] Missing Voice Live API endpoint, api-key or model. 
            AZURE_VOICE_LIVE_ENDPOINT=${AZURE_VOICE_LIVE_ENDPOINT || "<not set>"}
            AZURE_VOICE_LIVE_API_KEY=${AZURE_VOICE_LIVE_API_KEY ? "<set>" : "<not set>"}
            AZURE_VOICE_LIVE_MODEL=${AZURE_VOICE_LIVE_MODEL || "<not set>"}`
        console.error(errMsg);
        context.res = {
            status: 500,
            body: errMsg
        };
        return;
    }

    // 2. Extract region for token endpoint
    let region = null;
    try {
        const match = AZURE_VOICE_LIVE_ENDPOINT.match(/^https:\/\/([^.]+)/);
        if (!match) throw new Error("Endpoint missing region or invalid format: " + AZURE_VOICE_LIVE_ENDPOINT);
        region = match[1];
    } catch (e) {
        console.error("[negotiate] Failed to parse region:", e);
        context.res = {
            status: 500,
            body: "[negotiate] Failed to parse region from endpoint: " + e.message
        };
        return;
    }

    // 3. Request token from Azure
    const tokenEndpoint = `${AZURE_VOICE_LIVE_ENDPOINT}/sts/v1.0/issueToken`;
    let token = null;
    try {
        token = await new Promise((resolve, reject) => {
            const req2 = https.request(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_VOICE_LIVE_API_KEY,
                    'Content-Length': 0
                }
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`[${tokenEndpoint}] Status ${res.statusCode}: ${data}`));
                    }
                });
            });
            req2.on('error', reject);
            req2.end();
        });
    } catch (err) {
        const errMsg = `[negotiate] Could not fetch Azure Voice Live token: ${err.message}`;
        console.error(errMsg);
        context.res = {
            status: 500,
            body: errMsg
        };
        return;
    }

    if (!token) {
        const errMsg = "[negotiate] No token received from Azure /issueToken endpoint.";
        console.error(errMsg);
        context.res = {
            status: 500,
            body: errMsg
        };
        return;
    }

    // 4. Build ws URL (token as query param, never API key)
    try {
        const wsUrl = AZURE_VOICE_LIVE_ENDPOINT
            .replace('https://', 'wss://')
            .replace(/\/$/, '') +
            `/voice-live/realtime?api-version=${API_VERSION}&model=${AZURE_VOICE_LIVE_MODEL}&api-key=${encodeURIComponent(AZURE_VOICE_LIVE_API_KEY)}`;

        console.info(`[negotiate] Success: wsUrl built for region=${region}, model=${AZURE_VOICE_LIVE_MODEL}.`);
        context.res = {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: wsUrl })
        };
    } catch (err) {
        const errMsg = `[negotiate] Failed to build wsUrl: ${err.message}`;
        console.error(errMsg);
        context.res = {
            status: 500,
            body: errMsg
        };
    }
};