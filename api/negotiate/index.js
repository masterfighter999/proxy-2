/**
 * Azure Static Web App function for Voice Live API negotiation.
 * Returns a WebSocket URL for the Voice Live API, with model and api-version.
 * 
 * Environment variables:
 *   AZURE_VOICE_LIVE_ENDPOINT (e.g. https://your-resource.voice.azure.com)
 *   AZURE_VOICE_LIVE_API_KEY
 *   AZURE_VOICE_LIVE_MODEL (e.g. gpt-4o)
 */

module.exports = async function (context, req) {
    const AZURE_VOICE_LIVE_ENDPOINT = process.env.AZURE_VOICE_LIVE_ENDPOINT;
    const AZURE_VOICE_LIVE_API_KEY = process.env.AZURE_VOICE_LIVE_API_KEY;
    const AZURE_VOICE_LIVE_MODEL = process.env.AZURE_VOICE_LIVE_MODEL;
    const API_VERSION = '2025-05-01-preview';

    // CORS preflight handler
    if (req.method === "OPTIONS") {
        context.res = {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        };
        return;
    }

    if (!AZURE_VOICE_LIVE_ENDPOINT || !AZURE_VOICE_LIVE_API_KEY || !AZURE_VOICE_LIVE_MODEL) {
        context.res = {
            status: 500,
            body: "Missing Voice Live API endpoint, api-key or model."
        };
        return;
    }

    const wsUrl = AZURE_VOICE_LIVE_ENDPOINT
        .replace('https://', 'wss://')
        .replace(/\/$/, '') +
        `/voice-live/realtime?api-version=${API_VERSION}&model=${AZURE_VOICE_LIVE_MODEL}&api-key=${encodeURIComponent(AZURE_VOICE_LIVE_API_KEY)}`;

    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: wsUrl })
    };
};