# L5R5e Combat Tracker Dock

Natywny moduł docka/karuzeli inicjatywy i osi konfliktu dla Foundry VTT 14 oraz forka systemu L5R5e. Moduł jest cienkim frontendem: nie implementuje ponownie inicjatywy, ruchu, akcji, warunków ani autorytetu MG.

## Wymagania

- Foundry VTT 14;
- system `l5r5e` w wersji co najmniej `1.14.103`;
- aktywny GM dla autorytatywnych zmian wydarzeń, late arrivals i automatycznego usuwania zmarłych.

## Instalacja

W wydaniu użyj manifestu:

`https://github.com/DonHuberto/l5r5e-combat-tracker-dock/releases/latest/download/module.json`

Instalacja deweloperska: skopiuj lub podlinkuj katalog repozytorium jako `Data/modules/l5r5e-combat-tracker-dock`. Polecenia nie wymagają zależności npm:

```text
npm test
npm run ci
npm run package
```

Artefakty trafiają do `dist/l5r5e-combat-tracker-dock` i `dist/module.zip`. Manifest, moduł i archiwum muszą mieć ten sam numer wersji.

## Prywatność zasobów

Dokładne Fatigue, Strife, Endurance, Composure, Strength i Discipline otrzymuje wyłącznie GM albo bieżący użytkownik z uprawnieniem OWNER do aktora. OBSERVER, friendly disposition i sam fakt, że aktor ma innego właściciela, nie wystarczają. Dla pozostałych użytkowników view-model zawiera wyłącznie skonfigurowaną etykietę opisową i kolor — bez `value`, `max`, procentu, szerokości paska ani numerycznego budżetu ruchu. Ukryty Combatant nie tworzy placeholdera.

MG może wybrać politykę „stany opisowe” albo „brak informacji”. Profile Fatigue, Strife oraz dwóch zasobów armii mają od zera do czterech aktywnych przedziałów, lokalizowane etykiety EN/PL i bezpieczny kolor CSS. Granice muszą ściśle rosnąć i kończyć się na 100%. Mechaniczne stany terminalne systemu mają pierwszeństwo.

## Dock i sterowanie

Dock korzysta z `combat.turns` bez sortowania lub mutowania kolejności. Obsługuje inicjatywę `0`, nierzuconą inicjatywę, badge grupy, stance, efekty, sygnały akcji/ruchu/Wody, cofnięcie ruchu, fokus/ping tokena i otwarcie karty zgodnie z uprawnieniami. MG ma natywne sterowanie startem, końcem, turą, resetem i rzutami NPC. Domyślnie dock jest przypięty u góry, używa portretu Aktora oraz kart 128 px o proporcji 1.5; ustawienia klienta pozwalają wybrać dolną krawędź, Token, inny rozmiar, orientację poziomą/pionową, tryb pływający i sposób przepełnienia.

## Wydarzenia i horyzont

Okno konfiguracji konfliktu pozwala tworzyć wydarzenia w rundzie bezwzględnej albo względnej, zmieniać kolejność, przesuwać, usuwać i rozstrzygać. Offset `0` lub przesunięcie w przeszłość trwającego konfliktu wymaga potwierdzenia aktywacji teraz. Widoczność:

- `hiddenUntilTrigger` — brak zapowiedzi, po aktywacji wydarzenie publiczne;
- `publicPreview` — bezpieczna zapowiedź w horyzoncie;
- `gmOnly` — nigdy nie trafia do view-modelu ani czatu gracza.

Autorytatywny GM aktywuje wydarzenie raz na początku rundy; stan i czas triggera są zapisane na Combat, więc reload go nie powiela. Wydarzenie można zapisać jako oznaczony JournalEntry w zapisywalnym kompendium. Dodanie z listy lub drag-and-drop tworzy migawkę z `sourceUuid`, więc późniejsza edycja szablonu nie zmienia planu.

Rozwinięty horyzont pokazuje bieżącą oraz 1–10 przyszłych rund w aktualnej kolejności. To jawnie oznaczona projekcja: nie symuluje przyszłych rzutów ani zmian kolejności i nie mutuje Combat. Ukryte elementy nie zdradzają swojej liczby.

## Odejście i dołączanie

Status `dead` usuwa wyłącznie Combatanta. Opcjonalnie tak samo działa Defeated dla minionów; samo Defeated postaci/adversary oraz Incapacitated, Unconscious i Dying nie usuwają uczestnika. Withdraw wymaga potwierdzenia, zapisuje historię odejścia i nie usuwa Aktora ani Tokenu.

Uczestników można dodawać z zaznaczonych Tokenów, listy Aktorów i drag-and-drop. Uczestnik actor-only wymaga potwierdzenia i nie ma ruchu po siatce. Systemowy `game.l5r5e.lateArrivals` stosuje jedną regułę niezależnie od tego, czy uczestnik pochodzi z docka, Token HUD czy standardowego Combat Trackera:

- Intrigue: normalny test Sentiment po dołączeniu;
- Skirmish: Tactics TN 2 na początku następnej rundy;
- Mass Battle: Command TN 2 na początku następnej rundy;
- Duel: trzeciego uczestnika nie można dodać do trwającego pojedynku.

Natywne `Combatant#roundJoined` odpowiada za brak tury w bieżącej rundzie. System rozstrzyga picker PC, sekretny rzut adversary, miniona, opportunity, Strife, stance, grupy i autorytet.

## Publiczne API systemu

Moduł używa `game.l5r5e.turns`, `movement`, `conditions`, `initiative`, `authority` i `lateArrivals`, a także publicznych metod `Combat#rollInitiative`, `Combat#rollNPC`, `startCombat`, `endCombat`, `nextTurn`, `previousTurn`, `resetAll`, `TokenDocument.createCombatants` oraz operacji dokumentów osadzonych. Nie patchuje prototypów i nie zapisuje równoległych flag mechanicznych.

## Test dwóch klientów

Uruchom klienta GM i gracza. Nadaj graczowi OWNER jednej postaci, OBSERVER drugiej i brak uprawnień do przeciwnika. Porównaj dock oraz DOM: tylko pierwszy aktor może ujawniać dokładne zasoby. Następnie sprawdź ukrytego Combatanta, trzy tryby wydarzeń, reload na początku rundy, late arrival dla czterech typów konfliktu i drugiego aktywnego GM. Pełna checklista znajduje się w [docs/MANUAL-TESTS.md](docs/MANUAL-TESTS.md).

## Znane ograniczenia

- testy automatyczne nie zastępują wizualnej i wieloklientowej weryfikacji w uruchomionym Foundry;
- horyzont jest projekcją aktualnej kolejności, a nie symulatorem przyszłych zmian;
- actor-only Combatant nie obsługuje taktycznego ruchu ani zasięgu;
- szablony wydarzeń wymagają zapisywalnego kompendium JournalEntry i flagi modułu;
- interfejs modułu ma lokalizacje angielską i polską.
