/**
 * Azure Static Web App function to return the Azure Voice Live API websocket URL
 * with the API key injected via query string (never expose key to browser!).
 * 
 * Expects:
 *   - AZURE_VOICE_KEY (env)
 *   - AZURE_VOICE_REGION (env)
 */

module.exports = async function (context, req) {
    const AZURE_VOICE_KEY = process.env.AZURE_VOICE_KEY;
    const AZURE_VOICE_REGION = process.env.AZURE_VOICE_REGION;

    if (!AZURE_VOICE_KEY || !AZURE_VOICE_REGION) {
        context.res = {
            status: 500,
            body: "Azure Voice API KEY or REGION not configured."
        };
        return;
    }

    // You may want to check for authenticated user here (optional)
    // const userToken = req.query.token || req.headers["authorization"];
    // if (!userToken) { ... }

    // Compose the websocket endpoint for Voice Live API (per MS docs)
    // Example: wss://<region>.api.speech.microsoft.com/voice/live/ws?api-key=YOUR_KEY
    const wsUrl = `wss://${AZURE_VOICE_REGION}.api.speech.microsoft.com/voice/live/ws?api-key=${encodeURIComponent(AZURE_VOICE_KEY)}`;

    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: wsUrl
        })
    };
};