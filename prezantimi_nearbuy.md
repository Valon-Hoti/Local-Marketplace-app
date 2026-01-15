# Struktura e Prezantimit: NearBuy
Ky dokument përmban pikat kryesore për prezantimin në PowerPoint, bazuar në template-in e kërkuar.

---

## Slide 1: Titulli
**Titulli Kryesor:** NearBuy - Tregu juaj lokal
**Nëntitulli:** Aplikacion për shit-blerje të shpejta dhe inteligjente
**Prezantuesi:** [Emri Juaj]

---

## Slide 2: Aplikacioni (NearBuy)
*Përmbledhje e shkurtër e qëllimit të aplikacionit.*

*   **Problemi:**
    *   Vështirësia për të gjetur blerës/shitës lokalë në platforma të stërngarkuara.
    *   Mungesa e mjeteve moderne (si kërkimi me foto) në tregjet aktuale lokale.
*   **Kujt i dedikohet:**
    *   Studentëve, banorëve lokalë, dhe kujtdo që dëshiron të shesë gjëra të përdorura ose të gjejnë oferta afër tyre.
*   **Qëllimi kryesor:**
    *   Të krijojë një platformë të thjeshtë, të sigurt dhe vizualisht tërheqëse për komunitetin lokal.

---

## Slide 3: Teknologjitë e përdorura
*Stack-u teknologjik që fuqizon aplikacionin.*

*   **Platforma mobile:**
    *   **React Native (Expo):** Për zhvillim të shpejtë cross-platform (iOS/Android).
*   **Backend:**
    *   **Supabase:**
        *   *Auth:* Menaxhimi i përdoruesve.
        *   *Database:* Ruajtja e shpalljeve dhe profileve.
        *   *Storage:* Ruajtja e fotove të produkteve.
        *   *Realtime:* Bisedat (Chat) në kohë reale.
*   **Vegla shtesë:**
    *   **Google Cloud Vision API:** Për identifikimin automatik të objekteve në foto (Visual Search).
    *   **GitHub:** Version control.
    *   **AI (Gemini Agent):** Asistent për kodim dhe dizajn.

---

## Slide 4: DEMO LIVE – Aplikacioni në veprim
*Skenari për demonstrimin live (3-4 minuta).*

1.  **Login / Register:**
    *   Tregoni opsionin "Vazhdo si vizitor" dhe pastaj Kyçjen e plotë për të zhbllokuar funksionet.
2.  **Krijimi i Postimit (CRUD):**
    *   **Krijo:** Postoni një artikull të ri (psh. një telefon).
    *   **Lexo:** Shfaqeni atë në "Ballina" (Home).
    *   **Ndrysho/Fshi:** Tregoni opsionin për të edituar çmimin ose fshirë postimin nga Profili.
3.  **Moduli Unik (Visual Search & Chat):**
    *   **Kërkimi Vizual:** Bëni një foto të një objekti dhe tregoni se si NearBuy sugjeron fjalë kyçe automatikisht.
    *   **Chat:** Dërgoni një mesazh shitësit në kohë reale.

---

## Slide 5: Përdorimi i AI në zhvillim
*Si u përdor Inteligjenca Artificiale gjatë krijimit.*

*   **Gjenerim kodi:**
    *   Krijimi i shpejtë i komponentëve UI (psh. kartat e produkteve, modalet).
    *   Refaktorimi i logjikës komplekse (psh. logjika e filtrimit).
*   **Përmirësim UI dhe structure:**
    *   Sugjerime për paletën e ngjyrave dhe UX (Dark Mode/Light Mode).
    *   Rregullimi i `KeyboardAvoidingView` për të mos mbuluar butonat.
*   **Shembull praktik:**
    *   *"AI ndihmoi në integrimin e Google Vision API duke gjeneruar funksionin për konvertimin e imazheve në Base64."*

---

## Slide 6: Çfarë mësova & hapat e ardhshëm
*Reflektimi personal dhe e ardhmja e projektit.*

*   **Njohuritë e fituara:**
    *   Puna me databaza në kohë reale (Supabase).
    *   Menaxhimi i state në aplikacione mobile komplekse.
    *   Integrimi i shërbimeve Cloud (Vision AI).
*   **Sfidat kryesore:**
    *   **Integrimi i Vision API:** Përpunimi korrekt i imazheve (Base64 sanitization) për të eliminuar error-et 400 nga Google Cloud.
    *   **Menaxhimi i Layout-it:** Zgjidhja e konfliktit vizual ku tastiera mbulonte butonat kritikë ("Vazhdo si vizitor"), duke përdorur `SafeAreaView` dhe pozicionim absolut.
    *   **Lokalizimi (i18n):** Menaxhimi i përkthimeve dinamike (SQ/EN) dhe mospërputhjet në formatet e datave midis gjuhëve.
    *   **Përditësimet e Expo:** Zgjidhja e paralajmërimeve të "routing" për skemat e ndërlikuara të navigimit (Tabs brenda Stack).
    *   **Vonesat në Ngarkim (Latency):** Optimizimi i kohës së hapjes së faqeve duke menaxhuar më mirë kërkesat e rrjetit dhe renderimin e komponentëve.
*   **Përmirësimet në versionin tjetër:**
    *   **Njoftimet "Push Notifications":** Për t'u njoftuar kur dikush dërgon mesazh apo poston diçka interesante.
    *   **Sistemi i Vlerësimit (Rating):** Mundësia për të vlerësuar shitësit me yje për të rritur besueshmërinë.
    *   **Kërkimi me Hartë:** Filtrimi i produkteve bazuar në distancën (Radius Search) dhe shfaqja në hartë.
    *   **Algoritëm Inteligjent:** Rekomandimi i produkteve të ngjashme bazuar në historikun e shikimit të përdoruesit.
    *   **Integrimi i Pagesave:** Mundësia për të rezervuar produktin direkt nga aplikacioni.
