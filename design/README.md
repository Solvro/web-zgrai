# Design

The final zgrai.pl screens, kept as the HTML sources from our design canvas.
They are design references, not app code: each file is one screen written for
the canvas runtime (`support.js`), so it does not render on its own in a
browser.

## Screens

| File                           | Screen                                      |
| ------------------------------ | ------------------------------------------- |
| `screens/V2Login.dc.html`      | 01 · Sign in with Google                    |
| `screens/V2Start.dc.html`      | 02 · Describe the problem, agents asleep    |
| `screens/V2Session.dc.html`    | 03 · Agents wake up, session created        |
| `screens/V2FinalAdmin.dc.html` | 07a · Live session, admin view              |
| `screens/V2FinalUser.dc.html`  | 07b · Live session, participant view        |
| `screens/V2Problems.dc.html`   | 08 · Your problems, opened from the logo    |

## Flow

1. Sign in with Google.
2. Describe what the group needs to decide. The sleeping agents wake up.
3. A session opens with a message to send to the group: the skill link, the
   session link and the token.
4. The live session: people on top, the chat on the left and the summary of
   steps on the right. Clicking a step shows each agent's opinion on it.
   - The admin sees the Master on the right side of the chat and can message
     it.
   - A participant sees their own agent on the right and cannot write.
5. The logo opens "Your problems": every space you started or joined, and a
   box to start a new one.

## Look

- Type: Geist, with Geist Mono for codes and times.
- Colors: ink `#0A0A0A` on white, greys `#6B6B6B`, `#A3A3A3` and `#F0F0F0`,
  and orange `#EA580C` for the step in progress.
- Wordmark: "zgr", then "ai" in white inside a black rounded chip, then ".pl"
  in grey.
- Agents are small bots (rounded head, antenna, two eyes), one color each:
  `#2563EB`, `#F97316`, `#14B8A6`, `#8B5CF6`, `#EC4899`, `#EAB308`,
  `#0EA5E9`, `#6366F1`, `#22C55E`, `#EF4444`. The Master is black. A bot that
  is asleep or has not joined yet is grey with closed eyes.
- Master messages are black bubbles with a small "MASTER · step" label. A
  step's decision shows in the chat only when the step ends.
