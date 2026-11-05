# Brainstorming – transkrypcja rozmowy (2026-11-05)

Automatyczna transkrypcja nagrania, może zawierać błędy rozpoznawania mowy.

---

**Sprecher 1:** Jest problem czy sytuacja, czy to jest właśnie wyjazd czy coś innego. No i to jest problem, który jakby dzieli się na wiele osób. Mamy różnych interesariuszy i każdy, który dokłada swoją cegiełkę do problemu...

**Sprecher 2:** No to jest też z przesuniętymi zajęciami naszymi.

**Sprecher 1:** ...i każdy, każda osoba, która musi cokolwiek tam właśnie swój wkład włożyć, no to ma właśnie kontekst, który jakby celujemy w to, że to są osoby, które używają jakiegoś własnego agenta, harnessa, LLM-a. No i każdy u siebie ma jakiś tam dostęp do własnych notatek czy to MCP konektorów. No i to jest po prostu narzędzie, które umożliwia im dokładanie się do tego centralnego problemu, używając ich lokalnego harnessu. Czyli na przykład, jeżeli to jest wyjazd, no to my im podrzucamy czy to link, czy jakkolwiek będziemy planować, żeby to było połączone, no to oni się łączą z tym potem na przykład swoim Claudem lokalnym, który wie, gdzie oni lubią przebywać, co lubią jeść, kiedy są mają dostępność, sprawdza im kalendarz. Jakby wszystkie te rzeczy dla każdej osoby są łączone w jedną kupę, no i potem centralny agent czy mózg jest w stanie rozwiązać ten problem mając kontekst...

**Sprecher 2:** Mózg w sensie Grokbot?

**Sprecher 1:** No to już zależy.

**Sprecher 2:** Żeby użyć, żeby użyć Grokbota?

**Sprecher 1:** No, przynajmniej...

**Sprecher 3:** A to zależy, można po API używać to spoko.

**Sprecher 2:** Można, można.

**Sprecher 1:** Tak to zrozumiałem, że...

**Sprecher 2:** Jest tam jakieś apiki do, w Cursorze czy...

**Sprecher 4:** Czyli co, każdy sobie ma osobnego harnessa i po prostu używamy jednego centralnego mózgu, które, pod które podłączamy te wszystkie...

**Sprecher 2:** Który centralny mózg ma 10 subagentów, chłopaki! Ja już to widzę! <śmiech> O! Pokaż!

**Sprecher 1:** Wiesz, ładne wizualizacje...

**Sprecher 4:** O, niesamowite.

**Sprecher 2:** Linek, coś chcesz dodać?

**Sprecher 4:** Dobra, to w jaki sposób w takim razie podłączyć...

**Sprecher 1:** MCP.

**Sprecher 2:** Tak. Model Context Protocol.

**Sprecher 1:** Zrobimy Grokownik na grakownik.solvro.pl, no i tam albo możemy zrobić dashboard, albo to będzie...

**Sprecher 2:** Ale to, czy pytanie, czy ograniczamy się do wyjazdów, czy do czegokolwiek?

**Sprecher 1:** Do czegokolwiek. To może być projekt na studia, to może być projekt jakiś researchowy...

**Sprecher 2:** To szerzej, bardziej.

**Sprecher 1:** To może być cokolwiek, gdzie po prostu masz kilku interesariuszy, z których każdy może coś wnieść albo no jakby ma swoje zdanie. No i jego basic to trochę reverse subagenci. Że jakby sobie spawnują subagentów, ale każdy subagent no to jest jakby interesariusz, który faktycznie ma swój jakiś lokalny kontekst.

**Sprecher 2:** Czekaj, pewnie dużo osób może coś podobnego zrobić, ale my zrobimy to najlepiej! Ładnie, wizualizacje... Ja ogólnie zaraz wam prześlę tę notatkę albo transkrypcję od razu i sobie wrzucimy na 10 agentów, żeby nam jeszcze pomysły...

**Sprecher 1:** Tak. Ja widzę jeszcze dwie opcje. W jakim momencie zaczynamy. Bo ja mogę na przykład być inicjalizatorem tej wycieczki i po prostu poprosić mojego Grokbota, aby stworzył taką wspólną przestrzeń. No i wtedy już po samym MCP może być w ogóle tworzenie tej przestrzeni. No i dostaję na przykład tylko zaproszenie z linkiem...

**Sprecher 2:** Hehe.

**Sprecher 1:** ...gdzie wysyłam tego linka innym znajomym. No i każdy ze znajomych wkleja do swojego czata tego linka i tak inicjalizuje tę sesję. To jest jakby jedna opcja.

**Sprecher 3:** No to brzmi najprościej, szczerze mówiąc, z tym linkiem.

**Sprecher 1:** Druga opcja jest taka, że no wcześnie powstaje jakiś dashboard, gdzie... jakiś dashboard, gdzie mogę utworzyć ten problem i widzę, jak tam właśnie agenciki sobie pracują.

**Sprecher 3:** Najlepiej by było, jakby nie było żadnego dashboardu, tylko jakby ten admin dashboard jest też MCP.

**Sprecher 1:** No, no właśnie, ale to jest ta pierwsza opcja.

**Sprecher 3:** A, no to nie słuchałem. <śmiech>

**Sprecher 1:** Że po prostu piszę Grokbotowi: "Hej, chcę zorganizować wycieczkę na 10 osób, stwórz mi przestrzeń". No i oni generują tę przestrzeń, no i wysyła mi powiedzmy wiadomość, którą mam rozesłać moim znajomym, tak? Aby każdy mógł wkleić tę wiadomość z jakimś tam tokenem, linkiem czy czymkolwiek.

**Sprecher 3:** No to w sumie możemy zrobić połączenie obu.

**Sprecher 1:** Tak, można zrobić obu. To jest jakby myślę, że bardzo... bardzo spoko.

**Sprecher 4:** Czyli tworzy się ta przestrzeń i ta przestrzeń jest przestrzenią z kontekstem każdej osoby, która się powiedzmy do, nie wiem, wydaje mi się, do danej na przykład wycieczki udziela? Tak. Jest na przykład 10 interesariuszy czy nawet 10 uczestników wycieczki i oni może dają swoje preferencje, żeby na przykład znaleźć wspólny mitigrand. Dokładnie. Czy to jest tak, że w takim razie będziemy kontekst jako od każdego interesariusza zapisywać jako sam tekst, czy coś jeszcze?

**Sprecher 1:** Nie, no to powiedzmy, że każdy na przykład w Grokbocie ma na pewno w głowie jakiś kontekst, jakby osoby...

**Sprecher 4:** Że każdy interesariusz korzysta z Grokbota po prostu?

**Sprecher 1:** Może być też Claude, no jakby cokolwiek, gdzie może mieć ten swój kontekst. Nie musimy go całego bezpośrednio wysłać temu drugiemu agentowi, no bo ja na przykład nie chcę od razu wysłać całej swojej historii tylko do planowania wycieczki. I wtedy ten lokalny, w sensie agent każdej osoby sobie tylko wybierze to co chce, no i potem będzie się kłócił... O, walki agentów! <śmiech>

**Sprecher 2:** Oho, oho. Ale ogólnie, no to rozumiem, że jakoś klient musi zainicjalizować sesję ze swoim agentem. Więc wtedy jak to robimy? Jakieś powiadomienia czy...

**Sprecher 1:** No jeśli ja utworzę powiedzmy taką przestrzeń, no to powiedzmy dostanę wiadomość, którą mogę wysłać znajomemu. No i w momencie, gdy ja ją wkleję albo ty ją wkleisz do swojego jakiegoś Grokbota, no to pobierze się skill, ten agent dołączy do tej sesji, no i będzie miał interakcję z tą sesją.

**Sprecher 2:** A jak utrzymać połączenie? Tak że, jakby wiesz, żeby mogli... żeby być pod ręką. Co?

**Sprecher 1:** To nie jest zbyt duży problem. Chyba Grok i tak działa w chmurze?

**Sprecher 2:** No tak, ale to działają agenci.

**Sprecher 3:** Czy to chmurowe agenci?

**Sprecher 3:** Chodzi o to, że jak ty masz na przykład... zacząłeś jako jeden z tych userów, masz swój kontekst, gadasz, vaibujesz sobie z tym ten, idziesz sobie na przykład nie wiem, gdziekolwiek, zamkniesz sobie tego taba, no to jak wrócisz do tej konwersacji? Mi się wydaje, że...

**Sprecher 1:** To będzie po prostu sesja w Grokbocie, która jest i tak chmurowa, więc ona będzie zawsze. I agencik, jak ty sobie pójdziesz zjeść, to się może albo kłócić w twoim imieniu, albo robić co chce.

**Sprecher 2:** Wyłapujesz napisanie? Ja notatkę robię, klasyczną. Znaczy wiecie o co mi chodzi? Chodzi mi o to, że czasem to nie będzie taki one-shot, tylko na przykład, że ten mózg będzie chciał dodatkowych informacji później. Tylko właśnie...

**Sprecher 1:** Tak, to wszystko, jakby agenci...

**Sprecher 2:** Tak, tylko właśnie jak zagwarantować to, że ten agent kliencki będzie pod ręką tego mózgu po jakimś czasie?

**Sprecher 1:** No w sensie będzie polling. W chmurze będzie ta cała jakby główna sesja i te agenty będą mogły odczytać... Nie wiem czy MCP ma coś w stylu webhooki albo jakieś websocket?

**Sprecher 2:** W tę stronę chciałem też pociągnąć...

**Sprecher 1:** Jeśli ma, no to można tego użyć, a jak nie ma, no to może być po prostu jakby polling.

**Sprecher 3:** Mi się wydaje, że najpierw by jakby ten skill czy MCP na bieżąco po prostu zapisywał konwersację o klientach do serwera.

**Sprecher 1:** Co? W sensie serwer będzie jakby tym głównym... Wszystko się będzie działo na serwerze.

**Sprecher 2:** Jakby mi chodzi o to, że masz serwer i masz tam mózg, który coś chce załatwić. I teraz są osoby ze swoimi agentami, które mogą się do tego MCP dobrać i dać kontekst i się pokłócić z tym mózgiem. Tylko dajmy na to ktoś dołączy, pokłóci się nie wiem, 5 minut i sesja się skończy, no bo jakby zapytanie – koniec. I teraz...

**Sprecher 1:** Dlaczego sesja miałaby się skończyć?

**Sprecher 2:** No bo musiałbyś cały czas podtrzymywać tę sesję.

**Sprecher 3:** No właśnie.

**Sprecher 1:** Ale mamy jeden wspólny kontekst dla całego...

**Sprecher 3:** Ale sesja może przecież sobie trwać ile chce. Jakby dlaczego nagle sesja ci znika po 5 minutach?

**Sprecher 2:** No bo MCP działa tak, że to jest po prostu tool do mojego agenta.

**Sprecher 1:** No tak.

**Sprecher 2:** No, no to wykonuje raz toola, przesyła coś...

**Sprecher 1:** Tak.

**Sprecher 2:** ...i siema.

**Sprecher 1:** No to wysyła na przykład, że: "Hej, ja tutaj powiedzmy reprezentuję Dawida i chcę pojechać jakby w Czechy". No i to ląduje w jakiejś chmurowej sesji jako wiadomość od tego agenta.

**Sprecher 2:** Spoko, wysyła to. No ale to odpowiada: "Hej, wysłałem, super" i się kończy sesja. I jak teraz ten serwer ma znowu coś dostać?

**Sprecher 1:** No i wtedy jakby lokalnie jest na przykład, jeśli nie ma faktycznie żadnych webhooków, to jest po prostu polling. Czyli pyta się... czyli wysłał swoją wiadomość i na przykład 5 sekund później albo co 5 sekund albo co 10 sekund się pyta: "Hej, czy są nowe wiadomości?".

**Sprecher 2:** Okey, czyli robimy skilla, który na Grokbocie pewnie ma to w jakieś crony czy coś, na Claudzie w Claude Code ma tam jakieś skrypty, może sobie jakieś monitory robić. Czyli po prostu robimy skilla uniwersalnego, żeby to jakoś działało.

**Sprecher 1:** Tak.

**Sprecher 3:** Może trzeba opracować własną łatarkę, która nałoży opcję websocketa na przykład.

**Sprecher 1:** To by był fajny pomysł. Drugi fajny pomysł, który by mi przyszedł... to można by zobaczyć, bo na przykład do OpenCode'a są wtyczki, tak jak robiliśmy na hacku, gdzie można modyfikować całe GUI. Więc może zamiast takiego, że mój ziomek mi wysyła jakiś tekst, który wklejam w swojego chata...

**Sprecher 2:** Tylko że totalnie się zamykamy na dostawcę, który go na... Bardzo dużo pomysłów opieramy na tym, że każdy ma swój harness.

**Sprecher 1:** Okey, no to może być ten. Ale jeśli by wystarczyło czasu, to może zrobić... jeśli się da w Grokbocie jakimś pluginem, po prostu GUI do tego, że ja mogę sobie przyciskiem utworzyć tę sesję, zaprosić znajomych i coś się wtedy wydarzy. Ale to myślę jak zostanie czas.

**Sprecher 4:** Okey. Ja próbuję tutaj katchupować i próbuję sobie wyobrazić, że na tym serwerze dla każdego interesariusza jest troszeczkę taki powiedzmy pudełeczko, które każde MCP call nie wiem, powiedzmy ma... jakiś nie wiem, czy to jest bezpieczne czy nie, ale powiedzmy, że tego twórcę kto to czy tego agenta odpowiedzialnego za daną osobę plus jakiś timestamp i po prostu każdy... każdy to pudełeczko ma kontekst jednej osoby i powiedzmy z to pudełeczko można wziąć i ściągnąć z powrotem.

**Sprecher 3:** Pudełko daj... do telewizora. Zaraz narysujemy ładnie.

**Sprecher 1:** No dokładnie nie wiem jak na czym polega w ogóle cel problemu. <śmiech>

**Sprecher 4:** Ja próbuję sobie po prostu to wyobrazić, no nie? Dobra, rysuj, zaraz...

**Sprecher 2:** Co ty tam dłubiesz? Nie, nice. Paint. Paint, dobra.

**Sprecher 1:** Będzie grokownik.solvro.pl... No.

**Sprecher 3:** W tekście nie było, w tekście nie było. No dobra.

**Sprecher 1:** No i powiedzmy tworząc sesję, tu się pojawi jedno pudełeczko, które będzie zarządzane przez jakiegoś master agenta. Powiedzmy, że będzie to też Grokbot. O, jak chujowo to zrobimy opusa. <śmiech> No i on dostaje taska na przykład: wycieczka. Tutaj ładnie dostanie taska. No i on wygeneruje powiedzmy nie wiem, jakiś link do skilla z jakimś tam kodem autoryzacyjnym, żeby też każdy po prostu randomowa osoba nie mogła dołączyć. No i to będzie jakaś pewnie wiadomość, która każdy w swoim lokalnym czy to Claude Code, czy jakimś też ChatGPT, czy właśnie w Grokbocie będzie mogła wkleić, utworzyć swoją sesję z profilem danej osoby. No i wtedy pewnie pierwsza wiadomość pójdzie od tego do tego, że: "Hej, ja tutaj dołączam, reprezentuję tę osobę i tak dalej", więc w ogóle wiemy kto kogo tutaj reprezentuje. No i wtedy tutaj mamy odpowiedź, że: "Cześć, dzięki. Naszym zadaniem jest ustalenie na przykład gdzie jedziemy na wycieczkę". No i tak jakby ze wszystkimi interesariuszami. No i tutaj będzie pytanie na przykład, właśnie czy macie... Master zada pytanie: "Czy macie jakieś preferencje?". No i wtedy każdy odpowie, że: "No na przykład, nie wiem, Dawid już był w Czechach, więc nie chce do Czech, a na przykład ja chcę do Austrii, bo coś tam". No i tutaj Master sobie pomyśli, no i powie: "Hmm, mamy problem. Trzy osoby chcą do Austrii, a jedna bardzo nie chce do Austrii. No ale mamy większość, więc jakby skill issue <śmiech>, albo zaproponuje: a co myślicie o na przykład Paryżu, tak?". I wtedy na przykład każdy powie, że: "O, jednak Paryż jest fajnym kompromisem" tego typu. No więc ustalamy, spoko, jedziemy do Paryża. No to może teraz czas znaleźć noclegi. No i albo każda... każdy osobno może znaleźć jakieś noclegi i zaproponować, albo Master poszuka jakichś noclegów, zaproponuje i na przykład ten powie, że za drogo, ten że za tanio, a ten że chce ze śniadaniem w tym hotelu. No i taka... taka sesja po prostu sobie będzie trwała, aż jakby ten cel będzie osiągnięty. No i wtedy jest koniec.

**Sprecher 4:** Jeżeli są out-of-scope pytania od samego Mastera, to w sumie Master mógłby powiedzmy stworzyć jakieś pola nie pola, w jakiś sposób znormalizowane na zapisywanie tych preferencji.

**Sprecher 1:** Ale nie musiałoby to też zależeć, bo on zrozumie po prostu zwykły tekst.

**Sprecher 4:** No w sumie też. Dobra, i to jest ten sposób...

**Sprecher 1:** Tak, a jednocześnie tutaj jakby user, to jest jakby u niego zwykła sesja, więc może zobaczyć co jego agencik robi, no albo dać też human-in-the-loop po prostu feedback.

**Sprecher 4:** Okey. I jesteś w stanie narysować jak Master korzysta z kontekstu każdego interesariusza? Bo teraz zrobiłeś po prostu to jak... jak wchodzi w interakcję, ale sam Master musi jeszcze zarządzać, tworzyć kontekst każdej poszczególnej osoby w jakiś sposób. Przynajmniej myślałem, że to powinno być wewnętrzne u niego po stronie serwera, nie? Że to zbiera...

**Sprecher 3:** Na pewno dublowanie całego kontekstu klienta nie ma sensu.

**Sprecher 4:** Nie ma sensu, ale chodzi o to co jest...

**Sprecher 3:** Zapisywanie właśnie...

**Sprecher 1:** Można sprawdzić, czy no tak jak w normalnych LLM-ach jest jakby tool-roles... W sumie nawet jest więcej ról. Jak w LLM-ach jest coś takiego jak role. No i z reguły masz server-role i jakby user-role, tak? Czyli jest ta twoja wiadomość i ta wiadomość jakby osoby, która i napisze. Więc można by sprawdzić, czy można te role sobie customowo dodawać i wtedy LLM dokładnie... no tak jak na Messengerze widzi, że ta wiadomość jest od Maćka, ta od Jana, a ta jeszcze od kogoś innego.

**Sprecher 3:** Rola dla każdego klienta.

**Sprecher 1:** Tak. Co ma w sumie sens, po prostu tworzenie wiadomości dla agentów.

**Sprecher 3:** Myślę czy to w sumie musi być MCP, żeby komunikować się z tym Masterem. Nie musi, może być nie wiem, Matrix. <śmiech> Chodzi mi o to, że nie chcę tu dochodzić do zdania, bo by się skończyło na nowym protokole. Ale... Nie wiem, ja nie mam myśli na razie, tylko ja poluję.

**Sprecher 1:** To też... W sensie może być tak, że na przykład ten skill każe każdemu klientowi utworzyć jakiś albo pobrać prosty kod pythonowy, który on będzie jakby zarządzał na przykład websocketem. Ale myślę, że przez samo MCP też jest okey, bo wtedy po prostu wracasz do komputera, pytasz się czy jest coś nowego, albo ten skill sam jakby sobie odświeża od czasu do czas i patrzy czy jest coś nowego. I... no wtedy ci mówi, że: "O, tutaj na Masterze podziało się takie i takie rzeczy". Basically trochę Messenger dla agentów, tylko z jakimś celem. I grupa sama w sobie ma jakby cel.

**Sprecher 2:** Okey. Ogólnie jak patrzę, to Claude ma jakieś rozwiązania, które dokładnie to co chcemy zrobić, tylko nie wiem jak z innymi dostawcami.

**Sprecher 3:** Właśnie te dwie strony MCP i WebSockety czy...

**Sprecher 2:** Dobra, to ktoś jeszcze coś chce powiedzieć, czy...

**Sprecher 3:** A prośba jeszcze odnośnie tego udostępniania, jakby inicjalizacji tej rozmowy. Możemy dosłownie zrobić po prostu, że jak powiedzmy admin tworzy problem, no to tam wypluwa gotowy prompt, który może rozesłać wszystkim...

**Sprecher 1:** No tak.

**Sprecher 3:** ...i oni to wklejają. Nie wiem czy to było poruszone.

**Sprecher 1:** Tak, no to jest właśnie ten początek powiedzmy z tym linkiem, kiedy w ogóle dashboardu nie potrzebujemy. A jeśli wystarczy czas i tokenów, można zrobić jakiś dashboard i wtedy...

**Sprecher 3:** Ewentualnie z dashboardu można by wysłać link, który odwiedzają klienci i tam po prostu jest na przykład przycisk "Otwórz w Claude Code", "Otwórz w..." dowolnym tym. I tam po prostu ci inicjalizuje nową konwersację. No i chyba tyle.

**Sprecher 2:** Fajnie. Okey.
