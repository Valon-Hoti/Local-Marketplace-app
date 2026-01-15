import { CONFIG } from '../constants/Config';

// Google Cloud Vision API Integration
// Free Tier: 1,000 units/month

const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${CONFIG.GOOGLE_CLOUD_VISION_API_KEY}`;

export const analyzeImage = async (base64Image: string, lang: string = 'sq'): Promise<{ label: string, score: number }[]> => {
    try {
        // Sanitize Base64: Remove data URI prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

        const body = {
            requests: [
                {
                    image: {
                        content: cleanBase64,
                    },
                    features: [
                        {
                            type: 'LABEL_DETECTION',
                            maxResults: 10,
                        },
                    ],
                },
            ],
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log("GOOGLE VISION RAW RESPONSE:", JSON.stringify(data).substring(0, 500) + "..."); // Log first 500 chars

        // Check for Google API Errors specifically
        if (data.error) {
            console.error("Google Vision API Error Full:", JSON.stringify(data));

            // Check for Billing specific error
            const isBillingError = JSON.stringify(data.error).includes('BILLING_DISABLED') ||
                data.error.message?.includes('billing');

            if (isBillingError) {
                throw new Error("Google Vision API kërkon që të aktivizoni Billing (Pagesat) në Google Cloud Console. Edhe për Free Tier duhet kartë krediti.");
            }

            throw new Error(data.error.message || "Google Vision API Error");
        }

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        if (!data.responses || data.responses.length === 0) {
            // If responses is empty but no error, it's weird but possible.
            console.warn("Google returned empty responses array");
            throw new Error("Google nuk ktheu asnjë përgjigje valide.");
        }

        const labels = data.responses[0].labelAnnotations;

        if (!labels || labels.length === 0) {
            return [];
        }

        // Extended Dictionary for translation
        const ALBANIAN_TRANSLATIONS: Record<string, string> = {
            // FURNITURE & HOME
            "furniture": "Mobilje", "table": "Tavolinë", "chair": "Karrige", "desk": "Tavolinë Pune",
            "couch": "Divan", "sofa": "Divan", "bed": "Krevat", "wood": "Dru", "room": "Dhomë",
            "cabinet": "Dollap", "shelf": "Raft", "lamp": "Llambë", "mirror": "Pasqyrë", "rug": "Tapet",
            "carpet": "Tapet", "curtain": "Perde", "door": "Derë", "window": "Dritare", "floor": "Dysheme",

            // ELECTRONICS & GADGETS
            "computer": "Kompjuter", "laptop": "Laptop", "keyboard": "Tastierë", "mouse": "Mius",
            "monitor": "Monitor", "electronics": "Elektronikë", "phone": "Telefon", "mobile phone": "Telefon Celular",
            "tablet": "Tablet", "camera": "Kamerë", "television": "Televizor", "tv": "Televizor",
            "headphones": "Kufje", "speaker": "Altoparlant", "battery": "Bateri", "charger": "Karikues",
            "cable": "Kabllo", "screen": "Ekrani", "remote": "Telekomandë", "smartwatch": "Orë Inteligjente",

            // FASHION & CLOTHING
            "clothing": "Veshje", "shirt": "Këmishë", "t-shirt": "Bluzë", "pants": "Pantallona",
            "jeans": "Xhinse", "shoe": "Këpucë", "sneakers": "Atlete", "dress": "Fustan",
            "jacket": "Xhaketë", "coat": "Pallto", "hat": "Kapelë", "cap": "Kapele", "scarf": "Shall",
            "gloves": "Doreza", "sock": "Çorape", "boot": "Çizme", "suit": "Kostum", "tie": "Kollare",
            "bag": "Çantë", "handbag": "Çantë Dore", "backpack": "Çantë Shpine", "wallet": "Portofol",
            "glasses": "Syze", "sunglasses": "Syze Dielli", "watch": "Orë", "jewelry": "Bizhuteri",
            "ring": "Unazë", "necklace": "Gjerdan", "bracelet": "Byzylyk", "umbrella": "Çadër",

            // VEHICLES
            "car": "Veturë", "vehicle": "Automjet", "wheel": "Rrotë", "tire": "Gomë",
            "bicycle": "Biçikletë", "bike": "Biçikletë", "motorcycle": "Mootor", "scooter": "Skuter",
            "truck": "Kamion", "bus": "Autobus", "van": "Furgon", "boat": "Varkë", "helmet": "Helmetë",

            // MUSIC & HOBBIES
            "guitar": "Kitare", "piano": "Piano", "drum": "Daulle", "violin": "Violinë",
            "music": "Muzikë", "instrument": "Instrument", "toy": "Lodër", "game": "Lojë",
            "ball": "Top", "sport": "Sport", "racket": "Raketë", "book": "Libër",

            // KITCHEN & TOOLS
            "tool": "Vegël", "drill": "Trapan", "hammer": "Çekiç", "screwdriver": "Kaçavidë",
            "bottle": "Shishe", "cup": "Filxhan", "glass": "Gotë", "plate": "Pjatë", "bowl": "Tas",
            "fork": "Pirun", "knife": "Thikë", "spoon": "Lugë", "pan": "Tigan", "pot": "Tenxhere",
            "appliance": "Pajisje", "refrigerator": "Frigorifer", "fridge": "Frigorifer",
            "oven": "Furrë", "stove": "Sobë", "microwave": "Mikrovalë", "washer": "Lavatriçe",

            // NATURE & MISC
            "plant": "Bimë", "flower": "Lule", "tree": "Pema", "grass": "Bari", "sky": "Qielli",
            "building": "Ndërtesë", "house": "Shtëpi", "road": "Rrugë", "water": "Ujë",
            "food": "Ushqim", "fruit": "Fruta", "vegetable": "Perime", "dog": "Qen", "cat": "Mace"
        };

        return labels.map((label: any) => {
            const englishText = label.description;
            const lowerText = englishText.toLowerCase();
            const score = label.score || 0;
            // Case-insensitive lookup
            const translated = ALBANIAN_TRANSLATIONS[lowerText] || englishText;

            return {
                label: translated, // Return Translated if found, else original English
                score: score
            };
        });
    } catch (error: any) {
        console.error('Error analyzing image:', error);
        // Throw the error so the UI can alert it
        throw new Error(error.message || "Gabim i panjohur gjatë analizimit.");
    }
};
