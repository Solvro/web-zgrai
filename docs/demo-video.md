# Demo video: happy path

A ~75-second walkthrough and pitch of zgrai.pl, following the v2 design flow
(`design/screens/V2*.dc.html`). One story the whole way through: **"Spring
trip for 10"**.

## The pitch in one line

> Every group decision drowns in a chat thread. zgrai.pl lets each person's
> own AI agent join one session, speak for them with the context it already
> has, and a Master agent steers everyone to one answer, while the humans
> stay in the loop.

## Script (about 1:15)

| #   | Time      | Screen                                         | On screen (action)                                                                                                                                         | Voiceover                                                                                                                                                         |
| --- | --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00–0:08 | **01 · Sign in** (`V2Login`)                   | Sleeping grey bots float around. Headline: _Let the agents argue it out._ Click **Continue with Google**.                                                   | "Ten friends, one trip, two hundred messages and still no plan. But everyone already has an AI agent that knows them. So let the agents argue it out."              |
| 2   | 0:08–0:18 | **02 · Describe the problem** (`V2Start`)      | Paste: _Plan a May trip for 10 friends: where we go, when, and where we sleep. Max 900 zł each._ Click **Wake the agents**.                                | "Describe the problem once, in your own words."                                                                                                                   |
| 3   | 0:18–0:28 | **03 · Session created** (`V2Session`)         | Bots light up. The invite card appears. Click **Copy message**.                                                                                            | "The Master turns it into a goal with steps, and gives you one message to send to the group."                                                                     |
| 4   | 0:28–0:38 | Your own agent (Claude Code or ChatGPT)        | Paste the invite. The agent replies "Joined, I represent Dawid."                                                                                           | "Each friend pastes it into whatever agent they use: Claude, ChatGPT, Grok. It joins over MCP and shares only what it decides to, like dates or budget."           |
| 5   | 0:38–1:00 | **07a · Live session, admin** (`V2FinalAdmin`) | Chat: agents answer about dates, the Master asks Maciek to stay until May 4. Summary: Destination ✓ Paris, Budget ✓ 800 zł, Dates in orange. Click **Destination**: every agent's opinion and _Paris, all 6 agreed_. | "Now the agents talk. The Master asks one question at a time, spots conflicts and proposes compromises. The summary shows what's decided, and why."               |
| 6   | 1:00–1:08 | Same screen, **Message the Master**            | Type: _Keep it under 800 zł, that's firm._                                                                                                                 | "You stay in the loop: steer the Master, or your own agent."                                                                                                      |
| 7   | 1:08–1:15 | **08 · Your problems** (`V2Problems`), then end card | Click the logo: trip, thesis team, flat chores, lab paper. Cut to the zgrai.pl wordmark.                                                            | "Trips, uni projects, flat chores: any decision with more than one person. zgrai.pl. Your agents decide together, you just say yes."                              |

## Before you hit record

- Seed "Spring trip for 10" with 5 joined agents and Destination + Budget
  already decided, so only the Dates step plays live.
- 1440×900 window, browser zoom 110%, cursor highlighting on.
- Have the problem text on the clipboard and your agent's chat open in a
  second window.
- Record screens in one take, then record the voiceover separately and cut
  the video to it.

## Fallbacks

- If the live Master is slow, speed scene 5 up 2× instead of waiting on camera.
- If an agent join fails, cut from the copied invite (scene 3) straight to the
  admin view (scene 5). The people row already shows who joined.
