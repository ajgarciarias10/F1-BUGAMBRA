# Development Data Rules

## Economy

- Split 1 of Season 1 starts each team at `100M`.
- Split 1 does not import a final team budget from the Excel.
- The balance is calculated by applying the operations selected from the Excel ranges.
- Team poles, team fastest laps, and team penalty-free counts are not economy mapping fields.
- From Split 2 onward, money evolves from the previous state according to the economic rules and operations defined for each split.
- The exact Split 2 evolution formula will be confirmed against the Excel ranges before importing it.
- At split close, a pilot not retained and not acquired by a release clause becomes `agente_libre` and enters the next split auction.
- A clause operation, auction purchase, and manual retention price are separate events.
- The opening price of the next split is entered manually after those events are resolved.

## Team Names

- Numeric suffixes in source spreadsheets identify a block or position, not a new team.
- `Zenith 1`, `Zenith 2`, and `Zenith 3` resolve to the canonical team `Zenith`.

## Manual Results And Excel Review

- Official results for a split are entered manually in the admin panel.
- The Excel review is a read-only comparison source and never silently overwrites manual results.
- Before an act is processed, qualy and race positions must be present for every participating pilot.
- Duplicate positions are rejected; DNF is the only result without a normal finishing position.
- Manual rivalries are stored per split and are not regenerated from the roster.
- Split 3 uses only qualy position, race position, and DNF in its result entry table.
