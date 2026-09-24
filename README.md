# NearBuy — Aplikacion Mobil për Tregun Lokal (Local Marketplace)

> **Projekti i Temës së Diplomës**  
> Aplikacion modern cross-platform i ndërtuar me **React Native (Expo)**, **TypeScript**, **Supabase** dhe **Google Cloud Vision AI**.

---

## 📱 Përmbledhje e Projektit

**NearBuy** është një platformë mobile për shit-blerje të shpejta, të sigurta dhe të lokalizuara. Aplikacioni lidh blerësit dhe shitësit e një komuniteti përmes një ndërfaqeje intuitive, bisedave në kohë reale, kërkimit inteligjent me AI dhe menaxhimit të plotë të shpalljeve.

---

## ✨ Funksionalitetet Kryesore

### 1. 🔍 Kërkim Inteligjent dhe Kategori
- **Kërkim në kohë reale:** Kërkim sipas titullit, përshkrimit apo lokacionit me sugjerime automatike dhe historik kërkimi.
- **Kërkim Vizual me AI (Google Cloud Vision API):** Mundësi për të ngarkuar apo fotografuar një produkt dhe AI sugjeron automatikisht fjalë kyçe dhe kategori përkatëse.
- **Filtra të Avancuar:** Sipas kategorisë, çmimit, gjendjes së artikullit (*I ri*, *Si i ri*, *I përdorur*) dhe statusit (*Aktiv*, *I shitur*, *I rezervuar*).

### 2. 💬 Komunikim në Kohë Reale (Real-time Chat)
- **Arkitekturë e pavarur për çdo bisedë:** Ndarje e qartë midis blerësit dhe shitësit (`buyer_id` dhe `seller_id`), duke parandaluar bisedën me veten apo përzierjen e bisedave.
- **Treguesi i mesazheve të palexuara (Unread Badges):** Shenjë e kuqe vizuale me numrin e mesazheve të palexuara në listën e bisedave dhe në shiritin e poshtëm (tabs).
- **Menaxhimi i mesazheve:** Fshirje e mesazheve vetjake dhe azhurnim i menjëhershëm përmes Supabase Realtime Channels.
- **Optimizim për iOS & Android:** Menaxhim i përsosur i tastierës (`KeyboardAvoidingView`) pa mbuluar fushën e shkrimit dhe pa shkaktuar shkëputje të fokusit në pajisjet moderne (iPhone me Safe Area / Dynamic Island).

### 3. 🛍️ Menaxhimi i Shpalljeve (CRUD)
- **Publikim:** Ngarkim i fotografive (kamera/galeri), zgjedhje e kategorisë, çmimit, gjendjes dhe lokacionit.
- **Modifikim & Fshirje:** Shitësi mund të ndryshojë të dhënat apo statusin e artikullit (*Aktiv* / *I shitur*) në çdo kohë.
- **Detajet e Produktit:** Karusel imazhesh, profil publik i shitësit, shpallje të ngjashme, ruajtje në të preferuarat (Favorites) dhe mundësi raportimi.

### 4. 👤 Autentikim dhe Profile
- **Supabase Auth:** Regjistrim me Email & Fjalëkalim, Kyçje, dhe Ruajtje e Sesionit.
- **Modaliteti Vizitor (Guest Mode):** Shfletim i plotë i tregut pa llogari; kërkohet kyçje vetëm për veprime si postimi apo dërgimi i mesazheve.
- **Profili i Përdoruesit:** Personalizim i emrit dhe fotos së profilit, pasqyrim i shpalljeve vetjake dhe shpalljeve të preferuara.

### 5. 🎨 Përvoja e Përdoruesit (UX & Design)
- **Temat Dark Mode & Light Mode:** Ndërrim i menjëhershëm i temës me paletë harmonike ngjyrash.
- **Shumëgjuhësi (i18n):** Përkrahje e plotë e dy gjuhëve: **Shqip** dhe **English**.
- **Animacione Native:** Tërheqje nga skaji i majtë për t'u kthyer mbrapa (*Swipe-to-go-back gesture*).

### 6. 🛡️ Siguria dhe Performanca
- **Sanitizim i Input-eve:** Mbrojtje nga injection dhe tekste me karaktere të dëmshme.
- **Kufizim i Shpejtësisë (Rate Limiting):** Parandalim i spam-it në dërgimin e mesazheve dhe publikimin e shpalljeve.
- **Supabase Row-Level Security (RLS):** Politika të rrepta sigurie në nivel të bazës së të dhënave ku përdoruesi mund të modifikojë vetëm të dhënat e tij.

---

## 🛠️ Teknologjitë e Përdorura (Tech Stack)

| Shtresa | Teknologjia | Përshkrimi |
| :--- | :--- | :--- |
| **Frontend Framework** | React Native (Expo SDK 57) | Zhvillim cross-platform i aplikacionit |
| **Gjuha** | TypeScript 6.0 | Tipizim i rreptë dhe siguri në kod |
| **Routing & Navigation** | Expo Router & Native Stacks | Navigim i shpejtë dhe modal stacks |
| **Komponentët UI** | Custom Vanilla Styles + Lucide Icons | Dizajn modern, minimalist dhe i përshtatshëm |
| **Baza e të Dhënave** | Supabase (PostgreSQL) | Baza relacionale me lidhje me çelësa të huaj |
| **Realtime Engine** | Supabase Realtime Channels | Sinkronizim i menjëhershëm i mesazheve |
| **Autentikimi** | Supabase Auth | Menaxhimi i JWT tokens dhe sesioneve |
| **Ruajtja e Skedarëve** | Supabase Storage | Ruajtja e imazheve të shpalljeve dhe profileve |
| **Inteligjenca Artificiale** | Google Cloud Vision API | Analizë e fotografive dhe etiketim automatik |

---

## 🚀 Nisja e Projektit Lokalisht

### 1. Parakushtet
- Node.js (versioni 18 ose më i ri)
- Expo Go në telefonin tuaj (iOS ose Android) ose emulator

### 2. Klonimi dhe Instalimi
```bash
git clone https://github.com/Valon-Hoti/Local-Marketplace-app.git
cd Local-Marketplace-app
npm install
```

### 3. Konfigurimi i Variablave të Mjedisit (`.env`)
Krijoni skedarin `.env` në rrënjën e projektit me të dhënat tuaja:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=your-google-cloud-vision-api-key
```

### 4. Ekzekutimi
```bash
npx expo start
```
Skanoni kodin QR me kamerën e telefonit tuaj (iOS) ose përmes aplikacionit Expo Go (Android).

---

## 📂 Struktura e Skedarëve

```text
LocalMarketplace/
├── app/                      # Rrugëzimi kryesor i Expo Router
│   ├── _layout.tsx           # Layout-i global me StatusBar dhe providers
│   └── index.tsx             # Navigimi kryesor me Tabs dhe Modal Navigation Stack
├── components/
│   ├── common/               # Komponentë të ripërdorshëm (SwipeBack, Cards, Modals)
│   ├── modals/               # Modalet e veçanta (Report, Image Preview, Filter)
│   └── screens/              # Faqet e aplikacionit
│       ├── HomeScreen.tsx    # Ballina me kërkim, kategori dhe grid shpalljesh
│       ├── ListingDetailScreen.tsx # Detajet e artikullit dhe kontaktimi
│       ├── SellScreen.tsx    # Publikimi i shpalljes me Vision AI
│       ├── EditListingScreen.tsx   # Modifikimi i shpalljes ekzistuese
│       ├── ChatListScreen.tsx      # Lista e bisedave me unread badges
│       ├── ChatScreen.tsx    # Dhoma e bisedës në kohë reale
│       ├── ProfileScreen.tsx # Profili, shpalljet e mia, cilësimet
│       ├── SellerProfileScreen.tsx # Profili publik i shitësit
│       └── AuthScreen.tsx    # Kyçja dhe regjistrimi
├── constants/                # Temat (Light/Dark), stilet globale dhe përkthimet
├── lib/                      # Supabase client, Vision AI API, Security / Rate Limiting
├── types/                    # Tipet e të dhënave TypeScript
└── utils/                    # Funksione ndihmëse (formatim çmimi, manipulim imazhi)
```

---

## 🎓 Tema e Diplomës
Ky aplikacion është zhvilluar si pjesë e temës së diplomës, me fokus në demonstrimin e integrimit të sistemeve mobile me shërbime moderne Cloud dhe Inteligjencë Artificiale.
