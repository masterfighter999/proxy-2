/**
 * Azure Static Web App function for Voice Live API negotiation.
 * Returns a WebSocket URL for the Voice Live API, with model and api-version.
 * 
 * Environment variables:
 *   AZURE_VOICE_LIVE_ENDPOINT (e.g. https://your-resource.voice.azure.com)
 *   AZURE_VOICE_LIVE_API_KEY
 *   AZURE_VOICE_LIVE_MODEL (e.g. gpt-4o)
 */

const https = require('https');

module.exports = async function (context, req) {
    const AZURE_VOICE_LIVE_ENDPOINT = process.env.AZURE_VOICE_LIVE_ENDPOINT;
    const AZURE_VOICE_LIVE_API_KEY = process.env.AZURE_VOICE_LIVE_API_KEY;
    const AZURE_VOICE_LIVE_MODEL = process.env.AZURE_VOICE_LIVE_MODEL;
    const API_VERSION = '2025-05-01-preview';

    if (!AZURE_VOICE_LIVE_ENDPOINT || !AZURE_VOICE_LIVE_API_KEY || !AZURE_VOICE_LIVE_MODEL) {
        context.res = {
            status: 500,
            body: "Missing Voice Live API endpoint, api-key or model."
        };
        return;
    }

    // 1. Get a token from Azure
    const region = AZURE_VOICE_LIVE_ENDPOINT.match(/https:\/\/([^\.]+)/)[1];
    const tokenEndpoint = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    const token = await new Promise((resolve, reject) => {
        const req = https.request(tokenEndpoint, {
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
                    reject(new Error(`Token request failed: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    }).catch(err => {
        context.res = {
            status: 500,
            body: "Could not fetch Azure Voice Live token: " + err.message
        };
        return null;
    });

    if (!token) return;

    // 2. Build ws URL (token as query param)
    const wsUrl = AZURE_VOICE_LIVE_ENDPOINT
        .replace('https://', 'wss://')
        .replace(/\/$/, '') +
        `/voice-live/realtime?api-version=${API_VERSION}&model=${AZURE_VOICE_LIVE_MODEL}&token=${encodeURIComponent(token)}`;

    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: wsUrl })
    };
};