# Visual regression

## Baseline

Capture all in-scope routes and component states across applicable viewports/themes for final acceptance. A representative pilot is a starting point, not sufficient evidence for a full migration. Stabilize dynamic dates, animation, random content, and network data where possible.

## Comparison

Use several signals:

- screenshot diff;
- DOM/structural evidence;
- responsive overflow;
- typography and wrapping;
- component state coverage;
- explicit explanation of intentional changes.

A pixel threshold is not a design verdict. Antialiasing can create false positives, while a serious behavioral error may affect few pixels.

## Geometry and control ownership

Follow `references/geometry-and-ds-acceptance.md` for the complete coverage matrix, measured border clearances, nested overflow, clipping, and opened custom DS controls. Missing coverage prevents `READY`.

## Acceptance

For every intentional visual difference, record:

- what changed;
- why it changed;
- which rule or decision authorizes it;
- how it was verified;
- rollback path.
