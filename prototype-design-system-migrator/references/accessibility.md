# Accessibility validation

Validate behavior, not only static markup.

## Required checks where applicable

- semantic roles and labels;
- keyboard reachability and logical order;
- visible `focus-visible` states;
- escape, arrow-key, tab, and enter/space behavior for composites;
- focus trapping and restoration for dialogs;
- errors linked to fields;
- disabled versus read-only semantics;
- icon-only accessible names;
- color contrast;
- zoom and reflow;
- reduced-motion handling;
- announcements for asynchronous status where needed.

Automated checks are useful but incomplete. Record which interactions were exercised. Do not claim accessibility from an axe score alone.
