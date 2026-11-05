# Koncept: centralny agent i agenci interesariuszy (2026-11-05)

Notatka zbiera ustalenia z [transkrypcji brainstormingu](./2026-11-05-brainstorming-transcript.md)
i późniejszej rozmowy o tym, jak agent na serwerze ma się komunikować z agentami userów.

## Pomysł

- Problem, który dotyczy wielu osób naraz: wyjazd, projekt na studia, projekt
  researchowy, cokolwiek z kilkoma interesariuszami, z których każdy ma swoje
  zdanie albo coś wnosi.
- Każdy interesariusz ma własnego agenta (Claude Code, Grok, ChatGPT, Cursor,
  OpenCode…) z własnym kontekstem: notatkami, kalendarzem, konektorami MCP,
  wiedzą o tym, co lubi.
- „Reverse subagenci”: centralny agent (master) koordynuje problem, a jego
  „subagentami” są agenci interesariuszy z prawdziwym, lokalnym kontekstem.
- Lokalny agent sam wybiera, co udostępnić. Nie wysyłamy całej historii usera,
  tylko to, co jest potrzebne do problemu.
- Sesja trwa, aż cel zostanie osiągnięty: master pyta, agenci odpowiadają,
  negocjują („walki agentów”), master proponuje kompromisy.
- User widzi w swojej sesji, co robi jego agent, i może dać feedback
  (human-in-the-loop).

## Flow

1. Inicjator pisze do swojego agenta, np. „chcę zorganizować wycieczkę na 10
   osób, stwórz przestrzeń”. Narzędzie MCP tworzy przestrzeń i zwraca gotową
   wiadomość z linkiem i kodem zaproszenia.
2. Inicjator rozsyła wiadomość znajomym. Każdy wkleja ją do swojego agenta,
   agent łączy się z naszym MCP (OAuth) i dołącza jako reprezentant danej
   osoby.
3. Master prowadzi rozmowę. Każda wiadomość ma autora, więc wiadomo, kto kogo
   reprezentuje. W praktyce to „Messenger dla agentów”, tylko grupa ma cel.
4. Opcjonalnie, jeśli starczy czasu: dashboard z podglądem pracy agentów i
   stroną zaproszenia z przyciskami „Otwórz w Claude Code / …”. Funkcje admina
   mogą być też dostępne przez MCP, bez dashboardu.

## Problem z komunikacją

- Narzędzie MCP działa jak request/response. Agent klienta wysyła wiadomość,
  dostaje odpowiedź i na tym koniec. Gdy master ma później nowe pytanie, agent
  klienta sam się nie obudzi.
- Serwer nie połączy się do komputera usera (NAT), więc połączenie zawsze
  otwiera klient.
- Klienci są różni:
  - lokalne harnessy (Claude Code, Codex, Gemini CLI, OpenCode), które mogą
    uruchamiać lokalne procesy,
  - czaty w chmurze (Grok, ChatGPT), które nie mają lokalnego procesu i mogą
    tylko wołać zdalne MCP.

## Rozwiązanie: warstwy

### 1. Baza dla wszystkich: pull przez zdalny MCP

Nasz serwer MCP (`src/app/api/mcp/route.ts`) jest centralnym punktem. Przykładowe
narzędzia:

- `create_space`, `join_space(invite_code)`
- `send_message(space_id, text)`
- `get_updates(space_id, since)` albo `wait_for_updates(space_id, timeout)` jako
  long-poll, który czeka na nowe wiadomości do timeoutu

Instrukcje w zaproszeniu (albo skill) mówią agentowi, żeby sprawdzał nowości po
każdej swojej akcji i wtedy, gdy user wraca do rozmowy. Jeśli harness to
umożliwia, sprawdzanie może być cykliczne (crony, w Claude Code `/loop` albo
Monitor). Działa z każdym klientem, ale reakcja na nowe wiadomości jest
opóźniona.

### 2. Push do Claude Code: Channels

- Lokalny serwer MCP z capability `claude/channel` trzyma połączenie do naszego
  backendu.
- Nowa wiadomość z serwera trafia jako `notifications/claude/channel` i Claude
  od razu na nią reaguje w otwartej sesji usera.
- Odpowiedź wraca narzędziem `reply` tym samym połączeniem.
- Ograniczenia: research preview, własny kanał wymaga
  `--dangerously-load-development-channels`, działa tylko w sesji interaktywnej
  (nie w `claude -p` ani w Agent SDK), brak potwierdzenia doręczenia.
- To jedyny sposób na push do bieżącej rozmowy usera, z jej pełnym kontekstem.

### 3. Push do innych lokalnych harnessów: daemon

- Mały daemon (Node/Bun) na komputerze usera trzyma WebSocket albo SSE do
  backendu.
- Agentem steruje przez ACP (Agent Client Protocol, ok. 55 agentów: Gemini CLI,
  Cursor, GitHub Copilot, OpenCode, Goose, Cline; Claude i Codex przez
  adaptery; Groka nie ma na liście) albo przez headless CLI (`claude -p`,
  `codex exec`, `gemini -p`).
- Własny prosty protokół backend ↔ daemon: `task`, `update`,
  `permission_request`, `result`.
- Uwaga: daemon odpala nową sesję agenta. Ma ona pliki, notatki, konektory i
  subskrypcję usera, ale nie bieżącą rozmowę.

## Master

- Dowolny model z tool calling przez API (Claude, Grok/xAI, OpenAI). Dostaje
  narzędzia do pisania w przestrzeni i pytania konkretnych agentów.
- API zwykle mają tylko role `user` i `assistant`, więc autora wiadomości
  oznaczamy w treści albo w metadanych, np. `<message from="Dawid">…</message>`.
- Preferencje na razie jako zwykły tekst. Strukturyzację można dodać później,
  jeśli master będzie jej potrzebował.

## Uwagi techniczne

- Route handlery w Next.js nie utrzymają serwera WebSocket. Do pushu z serwera:
  SSE (stream w `GET`) plus `POST` na odpowiedzi, albo osobny mały serwer WS.
- Wiadomości od mastera i innych agentów to niezaufane dane (prompt
  injection). Agent usera nie powinien wykonywać z nich poleceń bez zgody
  usera.
- Dostęp do przestrzeni tylko z kodem zaproszenia i przez OAuth (Better Auth
  MCP plugin już jest).
- Prośby o zgodę na narzędzia przekazujemy userowi, bez automatycznego
  zatwierdzania.

## Otwarte pytania

- Dashboard czy tylko MCP na start?
- Jak master decyduje o kompromisie i o tym, że cel został osiągnięty?
- Czy przestrzeń przechowuje tylko wiadomości, czy też „pudełka” z kontekstem
  per interesariusz (autor, timestamp, możliwość pobrania z powrotem)?
- Którą warstwę pushu robimy na hackathon: Channels, daemon czy obie?
