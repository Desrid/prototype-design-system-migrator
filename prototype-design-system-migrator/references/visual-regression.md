# Visual regression

## Baseline

Capture representative routes, viewports, themes, data states, and interactive states before migration. Stabilize dynamic dates, animation, random content, and network data where possible.

## Comparison

Use several signals:

- screenshot diff;
- DOM/structural evidence;
- responsive overflow;
- typography and wrapping;
- component state coverage;
- explicit explanation of intentional changes.

A pixel threshold is not a design verdict. Antialiasing can create false positives, while a serious behavioral error may affect few pixels.

## Acceptance

For every intentional visual difference, record:

- what changed;
- why it changed;
- which rule or decision authorizes it;
- how it was verified;
- rollback path.
