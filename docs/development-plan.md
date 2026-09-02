# Development Data Rules

## Economy

- Split 1 of Season 1 starts each team at `100M`.
- Split 1 does not import a final team budget from the Excel.
- The balance is calculated by applying the operations selected from the Excel ranges.
- Team poles, team fastest laps, and team penalty-free counts are not economy mapping fields.
- From Split 2 onward, money evolves from the previous state according to the economic rules and operations defined for each split.
- Keep and clause prices move on every race of the block, not once: the clause interpolates linearly from its opening value to the purchase price on the last race, and keep holds its opening ratio to the clause.
- A price agreed in the market freezes out of that curve until the block closes.
- Every pilot goes through the market day auction. Retention and release clause are not private transactions that settle beforehand: the incumbent team bids for its own pilot against the rest.
- A team loses any pilot it held in the previous split that it did not sign for the next one. There is no right to match and no automatic carry-over.
- There is no floor price. Bidding opens at whatever the first bidder offers, and the first bidder is drawn at random.
- Clause money is withdrawn from the system. The team that loses the pilot is paid nothing, in the auction as well as in the spreadsheet.
- The purchase price of the next split is what the auction settled at, for all three operation types. Retention applies no discount against the pilot's previous value.

## Split Lifecycle

- Closing a block, opening the transfer market and creating the next split are one configurable tool, not one panel per block.
- A new split inherits closing balances and overalls from the previous one; race numbering continues across a season and restarts on a new one.
- A new season resets every team to the same starting budget and sends the whole grid to the market.
- Opening balances can be anchored to the spreadsheet; the derived total is still computed and any deviation is reported.

## Market Day

- The auction runs live in the app. Room state lives at `splits/{splitId}/subasta/sala`, bids at its `pujas` subcollection.
- The admin sets the auction length, the extension window, the squad size and the date the market opens.
- Until that moment the room shows only a countdown, and it uncovers itself when the clock runs out. No reload needed.
- The countdown gates the real market only. Simulation mode ignores it, so a rehearsal is always available.
- Opening balances transcribed from the spreadsheet win over the derived total; a deviation is reported, never absorbed.
- A bid inside the extension window pushes the clock back to that window, so a last-second bid cannot win by timing alone.
- A bid must beat the standing one and must fit the team's budget. A team with a full squad cannot bid.
- Simulation mode replays the whole flow without touching budgets or rosters, and is the default. Real mode adjudicates through the normal signing path.
- An auction with no bids leaves the pilot unsold.

## Pilot Overall

- A pilot's overall is a career trajectory, not a per-split snapshot.
- The trajectory starts at the pilot's own debut, which is Origins for some and a later split for others. Debut split is recorded, not assumed.
- A debut starts at `70`; the floor is `50` and the ceiling is `99`.
- Each race applies a delta measured against that race's own points average, so grid size does not distort it.
- The overall a pilot closes a split with is the base of the next split the pilot appears in, even if blocks were skipped in between.
- Origins records points per race only, with no position, pole or DNF, so its deltas come from pace alone.
- Ratings are rebuilt by replaying the block from its base, never accumulated onto the stored value. This runs automatically whenever an act is saved.
- `rating_base` is set once, when the split builder inherits the pilot from the previous block. Changing an old block's results does not re-propagate down the chain on its own.

## Free Agents

- `agente_libre` is where pilots without a team are stored, not a team. It never appears in a team list, has no budget and scores no points.
- A pilot being a free agent is read from their own `equipoId`, and is shown as a status on the pilot.

## Team Names

- Numeric suffixes in source spreadsheets identify a block or position, not a new team.
- `Zenith 1`, `Zenith 2`, and `Zenith 3` resolve to the canonical team `Zenith`.

## Manual Results And Excel Review

- Official results for a split are entered manually in the admin panel.
- The Excel review is a read-only comparison source and never silently overwrites manual results.
- Before an act is processed, qualy and race positions must be present for every participating pilot.
- Duplicate positions are rejected; DNF is the only result without a normal finishing position.
- Manual rivalries are stored per split and are not regenerated from the roster.
- Manual rivalry configuration stores only its pilot members; economic rewards are calculated per race from the official positions and rules.
- Split 3 uses only qualy position, race position, and DNF in its result entry table.
