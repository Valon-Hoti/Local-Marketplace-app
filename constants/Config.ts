
// Configuration Constants
// In a production environment, these should be loaded from environment variables (e.g., .env)
// For this student project demo, we centralize them here for clarity.

export const CONFIG = {
    // Google Cloud Vision API Key
    // WARNING: Ideally this should be restricted by IP or moved to a backend proxy.
    GOOGLE_CLOUD_VISION_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY || '',

    // App Config
    APP_NAME: 'LocalMarketplace',
    VERSION: '1.0.0',
};
