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
- **🍳 Recept** – bläddra bland recept, välj om du vill ha **butikernas egna märken**
  (ICA Basic, Eldorado hos Willys/Hemköp, Xtra hos Coop, Favorit hos City Gross, Lidls egna) eller märkesvaror, och se vad receptet kostar
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

## Live-data från butikerna

### 📄 Originalbladen – direkt i appen (`lib/integrations/tjek.ts`)

Kedjorna publicerar sina riktiga reklamblad på Tjek-plattformen (ereklamblad.se). Appen
hämtar **bladets originalsidor som bilder** plus **hotspots** – varje erbjudandes exakta
polygon-position på sidan med namn, pris och mängd. Det betyder:

- Du bläddrar i **hela det riktiga bladet inne i appen** (ingen extern sida öppnas).
- Du **ringar in direkt på originalsidorna** – appen träffdetekterar mot hotspots och lägger
  rätt vara med rätt pris i listan.
- Varans bild i inköpslistan **beskärs ur själva bladet** (canvas-crop av hotspot-regionen).
- Bladet väljs utifrån din position (`r_lat`/`r_lng`), så du får din regions blad.

Verifierat i Stockholmsområdet: Lidl (30 sidor, 192 erbjudanden), ICA Kvantum & Maxi,
Stora Coop & Coop X:-TRA, City Gross och Willys/Willys Hemma. API-nyckeln är ereklambladets
publika webbnyckel; sätt `TJEK_API_KEY` om du har en egen. Saknas blad för en kedja faller
appen tillbaka enligt nedan.

### 🟢 Butikernas egna API:er (`lib/integrations/axfood.ts`)

- **Willys & Hemköp** – appen hämtar **alla riktiga butiker** (`/axfood/rest/store`), väljer
  den **närmast din hemposition**, och laddar **veckans riktiga erbjudanden** för just den
  butiken (`/search/campaigns/offline`): riktiga namn, varumärken, kampanjpriser, ordinarie
  priser, jämförpriser, produktbilder, medlemserbjudanden och giltighetsdatum. Används som
  reklambladsvy när Tjek-blad saknas (t.ex. Hemköp) och för närmaste-butik i reseplaneringen.
- **Lidl** – `lib/integrations/lidl.ts` läser den stabila översiktssidan
  `lidl.se/c/reklamblad/s10018018` som extra fallback.

### Fortfarande exempeldata

- **Kedjor utan blad på Tjek och utan öppet API** får genererade blad från en produktkatalog
  med realistiska prisnivåer (riktiga produktfoton via `scripts/scrape-product-images.mjs`).
- **Prishistorik**: härleds ur ordinarie pris (Axfood skickar f.ö. med
  `offlinePromotionLowestHistoricalPrice` – en naturlig nästa utbyggnad är att spara veckans
  priser i en tidsserie så historiken blir helt verklig).
- **Populära tider**: Google exponerar inte "popular times" i sitt officiella Places-API, så
  kurvorna är modellerade (vardagstopp 16–18, helgtopp runt lunch). Adaptern är en ren funktion
  (`busynessAt`) som är enkel att byta mot t.ex. BestTime.app.

## Teknik

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4. Ingen databas behövs –
listan, hempositionen, butiksval och dina tuschringar sparas i `localStorage`.
