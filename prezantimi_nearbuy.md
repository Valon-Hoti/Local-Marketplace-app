# Struktura e Prezantimit: NearBuy (Tema e Diplomës)
Ky dokument përmban pikat kryesore dhe skenarin e detajuar për prezantimin para komisionit të diplomës.

---

## Slide 1: Titulli dhe Hyrja
- **Titulli Kryesor:** NearBuy — Tregu Lokal Inteligjent (Local Marketplace)
- **Nëntitulli:** Zhvillimi i një aplikacioni mobil të sigurt për shit-blerje në kohë reale me mbështetje të Inteligjencës Artificiale
- **Kandidati:** [Emri Juaj]
- **Mentori:** [Titulli dhe Emri i Mentor-it]
- **Universiteti/Fakulteti:** [Emri i Universitetit / Fakultetit]

---

## Slide 2: Problemi dhe Zgjidhja
*Përmbledhje e qartë e motivimit dhe vlerës së projektit.*

* **Problemet e identifikuara:**
  - Platformat tradicionale të shitblerjes shpesh janë të stërngarkuara, të ngadalta dhe jo të përshtatura për tregjet lokale.
  - Komunikimi midis blerësit dhe shitësit shpesh varet nga rrjete të jashtme (WhatsApp, Viber) duke humbur kontekstin e artikullit.
  - Mungesa e veglave moderne si kërkimi vizual dhe identifikimi automatik i produkteve.
* **Zgjidhja — NearBuy:**
  - Një aplikacion mobil modern, i pastër dhe me performancë të lartë.
  - Chat i integruar në kohë reale me tregues të mesazheve të palexuara dhe ndarje të qartë midis blerësve.
  - Kërkim inteligjent me AI përmes fotografive të kamerës.
  - Siguri e përforcuar (sanitizim të dhënash, kufizim të kërkesave / rate-limiting, politika RLS).

---

## Slide 3: Arkitektura dhe Teknologjitë
*Stack-u teknologjik i integruar në mënyrë harmonike.*

* **Front-end Mobil:**
  - **React Native & Expo (SDK 57):** Zhvillim cross-platform me performancë native.
  - **TypeScript:** Tipizim i rreptë dhe parandalim i gabimeve gjatë zhvillimit.
  - **Reanimated & Gestures:** Animacione natyrale dhe mbështetje për *Swipe-to-go-back*.
* **Back-end & Cloud Infrastructure (Supabase):**
  - **PostgreSQL Database:** Struktura relacionale me Foreign Keys dhe indekse për performancë.
  - **Supabase Realtime:** Transmetim i menjëhershëm i mesazheve përmes WebSockets.
  - **Supabase Auth:** Autentikim me JWT tokens, ruajtje e sigurt e sesionit dhe mbështetje për *Guest Mode*.
  - **Supabase Storage:** Ruajtje dhe optimizim i imazheve të produkteve.
* **Inteligjenca Artificiale (Cloud AI):**
  - **Google Cloud Vision API:** Analizë imazhesh, etiketim automatik i objekteve dhe sugjerim i kategorisë/titullit.

---

## Slide 4: DEMO LIVE – Skenari i Demonstrimit (4-5 Minuta)
*Udhëzues hap pas hapi për demonstrimin para komisionit:*

1. **Hapi 1: Eksplorimi si Vizitor (Guest Mode)**
   - Hapja e aplikacionit pa llogari: Shfaqni shfletimin e lirë të produkteve, filtrat sipas kategorive dhe kërkimin me historik.
   - Tentoni të dërgoni një mesazh apo të postoni një artikull: Aplikacioni kërkon kyçje me një dialog miqësor.

2. **Hapi 2: Kërkimi Vizual me AI (Google Vision API)**
   - Klikoni butonin e kamerës në fushën e kërkimit: Zgjidhni një foto (psh. telefon, orë, karrige).
   - Tregoni se si Google Vision API analizon imazhin dhe nxjerr menjëherë fjalë kyçe relevante që filtrojnë produktet automatikisht.

3. **Hapi 3: Publikimi dhe Menaxhimi i një Shpalljeje (CRUD)**
   - Kyçuni me llogarinë tuaj.
   - Publikoni një artikull të ri me foto nga galeria, çmim, gjendje (*I ri* / *I përdorur*) dhe përshkrim.
   - Tregoni ndryshimin e statusit të artikullit (*Aktiv* ➔ *I shitur* / *I rezervuar*).

4. **Hapi 4: Sistemi i Bisedave në Kohë Reale (Real-Time Chat)**
   - Hapni një shpallje dhe shkruani një mesazh shitësit.
   - Tregoni **shenjën e kuqe vizuale (badge)** me numrin e mesazheve të palexuara në listën e bisedave dhe në ikonën e Tabs.
   - Demonstroni hapjen e dhomës së bisedës: Tastiera hapet në mënyrë të përsosur mbi fushën e shkrimit pa e mbuluar atë dhe pa boshllëqe në iPhone.
   - Shfaqni mundësinë e fshirjes së mesazhit dhe shënimin automatik të bisedës si të lexuar posa të hapet.

5. **Hapi 5: Përvoja e Përdoruesit dhe Cilësimet**
   - Ndërroni gjuhën nga **Shqip** në **English** në mënyrë të menjëhershme.
   - Ndërroni temën nga **Light Mode** në **Dark Mode** duke theksuar përshtatjen e plotë të ngjyrave dhe kontrastit.

---

## Slide 5: Përdorimi i Inteligjencës Artificiale gjatë Zhvillimit
*Si ndihmoi AI si mjet bashkëpunues inxhinierik:*

* **Arkitekturë dhe Zgjidhje Problemash:**
  - Zgjidhja e problemeve komplekse të layout-it (p.sh. llogaritja e saktë e `KeyboardAvoidingView` në pajisjet me Dynamic Island dhe Safe Area pa shkaktuar re-renders të panevojshëm).
  - Strukturimi i logjikës relacionale për mesazhet me `buyer_id` për të garantuar privatësi të plotë midis blerësve të ndryshëm për të njëjtin produkt.
* **Siguria e Kodit:**
  - Gjenerimi i funksioneve për sanitizim të input-eve dhe rate limiting në front-end për të parandaluar spamming.
  - Krijimi i skripteve SQL me politika Row-Level Security (RLS) për mbrojtjen e bazës së të dhënave.

---

## Slide 6: Sfidat Teknike të Tejkaluara
*Pikat kyçe që dëshmojnë aftësi inxhinierike gjatë prezantimit:*

1. **Menaxhimi i Tastierës në iOS:**
   - Zgjidhja e konfliktit të brendshëm të GiftedChat në iOS me Safe Area: Eliminimi i mbylljes së menjëhershme të tastierës përmes memoizimit të duhur (`useCallback`/`useMemo`) dhe një spacer-i fiks për Home Indicator.
2. **Respektimi i Rregullave të Hooks në React:**
   - Parandalimi i thirrjes së kushtëzuar të hooks gjatë ndryshimit të gjendjes së sesionit (Guest vs Authenticated), duke garantuar stabilitet 100%.
3. **Përpunimi i Imazheve për Vision API:**
   - Përpunimi dhe sanitizimi i saktë i stringjeve Base64 për të evituar refuzimet HTTP 400 nga serverat e Google Cloud.
4. **Izolimi i Bisedave midis Përdoruesve:**
   - Ndërtimi i dhomave të bisedës me `listing_id` dhe `buyer_id`, duke siguruar që shitësi mund të bisedojë veçmas me secilin blerës të interesuar.

---

## Slide 7: Përfundime dhe Zhvillimi i Mëtejmë
*E ardhmja e projektit dhe hapat pas diplomimit:*

* **Përfundimet:**
  - Aplikacioni është i plotë, stabil, i sigurt dhe i gatshëm për përdorim në mjedise reale.
  - Është vërtetuar se integrimi i AI në pajisje mobile shton vlerë të madhe praktike për përdoruesit lokalë.
* **Hapat e ardhshëm (Roadmap):**
  - **Njoftimet Push (Push Notifications):** Për të njoftuar përdoruesit në kohë reale kur marrin një ofertë apo mesazh.
  - **Kërkimi Gjeografik me Hartë (Map & Geolocation):** Zbulimi i shpalljeve në një rreze të caktuar kilometrash.
  - **Sistemi i Vlerësimeve me Yje (Reviews & Ratings):** Për të rritur besueshmërinë e shitësve në komunitet.
  - **Pagesat e Integruara:** Mundësia për të kryer depozita apo pagesa direkte përmes Stripe.
