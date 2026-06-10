# ✏️ Veckans Klipp

Bläddra i veckans reklamblad från Sveriges vanligaste matbutiker — **Lidl, ICA, City Gross,
Willys, Hemköp och Coop** — och **ringa in varorna du vill ha**, precis som i en
leksakskatalog när du var liten. Varorna hamnar i en smart inköpslista som planerar hela
handlingsrundan åt dig.

## Funktioner

- **📰 Reklamblad att cirkla i** – varje kedjas veckoblad visas som bläddringsbara sidor.
  Rita en ring med fingret eller musen runt en vara så läggs den i listan (med en kvarliggande
  rosa tuschring, så klart).
- **🛒 Smart inköpslista** – varorna grupperas per butik, med **närmaste butik först**.
  Du ser summan per butik, totalsumman för allt, och hur mycket du sparar mot ordinarie pris.
- **📈 Prishistorik** – varje vara visar vad den kostade **för 1 månad sen** och
  **för 6 månader sen**, så du kan hålla koll på prisutvecklingen.
- **📊 Hur fullt är det i butiken?** – "populära tider" per butik och timme (à la Google).
  Välj "nu" eller låt appen **föreslå en lugnare tid**.
- **🗺️ Reseplanering** – välj färdsätt (**bil, cykel, gå eller kollektivt**) och få en
  hem-till-hem-tid: restid + tid inne i butikerna (inklusive kö när det är fullt).
- **🚦 Trafikläge** – lätt/måttlig/tung trafik per timme vägs in (mycket för bil, lite för
  buss, inte alls för cykel/gång) när appen föreslår **den ultimata tiden att handla**.
- **🍳 Recept** – bläddra bland recept, välj om du vill ha **lågprismärken**
  (ICA Basic, Eldorado, Garant, Xtra, Favorit) eller märkesvaror, och se vad receptet kostar
  i varje butik – plus den **bästa mixen** (billigaste butiken per ingrediens) och hur mycket
  du sparar. Lägg hela receptet i listan med ett klick och få restid inklusive trafik och
  butiks­trängsel.

## Kom igång

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # produktionsbygge
```

## Riktiga datakällor (API-nycklar)

Appen fungerar direkt utan nycklar med inbyggda estimat och exempeldata. Lägg nycklarna i
`.env.local` så används riktiga tjänster automatiskt (se `lib/integrations/routing.ts` och
`app/api/route`):

| Variabel | Tjänst | Används till |
|---|---|---|
| `TRAFIKLAB_RESROBOT_KEY` | [Trafiklab ResRobot v2.1](https://www.trafiklab.se/api/our-apis/resrobot-v21/) | Kollektivtrafik-restider i hela Sverige |
| `TOMTOM_API_KEY` | [TomTom Routing](https://developer.tomtom.com/routing-api/documentation) | Bilrutter med **live-trafik** |
| `OSRM_URL` | [OSRM](https://project-osrm.org/) (sätt `demo` för demoservern) | Cykel- och gångrutter (trafik kvittar) |

### Vad som är exempeldata i denna version

- **Reklambladen**: kedjorna publicerar sina blad som PDF/e-magasin utan öppet API. I den här
  versionen genereras bladen från en gemensam produktkatalog med realistiska prisnivåer per
  kedja (Lidl/Willys billigast, Hemköp dyrast, lågprismärken ca 30 % under märkesvaror).
  En produktionsversion skulle hämta och tolka bladen veckovis (PDF-parsning/OCR) och spara
  varje varas pris i en tidsserie — prishistoriken i appen läser redan från ett sådant gränssnitt
  (`lib/pricing.ts`).
- **Populära tider**: Google exponerar inte "popular times" i sitt officiella Places-API, så
  kurvorna är modellerade (vardagstopp 16–18, helgtopp runt lunch). Adaptern är en ren funktion
  (`busynessAt`) som är enkel att byta mot t.ex. BestTime.app.
- **Butiker**: sex exempelbutiker runt Stockholm. Hempositionen väljs bland förval eller via
  enhetens GPS.

## Teknik

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4. Ingen databas behövs –
listan, hempositionen, butiksval och dina tuschringar sparas i `localStorage`.
