# Craft Standards

Follow these standards for all code, UI, and copy in this repository. The project must read as the work of a careful human developer, not generated output.

## Visual Design
- One restrained palette: neutral base, one accent colour, semantic colours only for status (approved, pending, blocked). No purple-to-blue gradients, no glassmorphism, no glowing effects, no gradient text.
- No emoji or sparkle icons in the interface. Use a single consistent icon set, used sparingly.
- One deliberate typeface pairing (not the framework default). Define a spacing scale and a type scale once and reuse them. Align everything to a grid.
- Design every state: loading, empty, error, success, long text. Use skeletons or plain loading text, not spinners everywhere.
- Motion: minimal and functional only (state changes, not decoration).
- Data should look like a real person's life: realistic product names, amounts, dates and merchants. No "Lorem ipsum", "Item 1", "User123", or round numbers everywhere.

## Copy
- Write concise, specific interface text in plain language. Ban marketing phrases like "supercharge", "seamless", "unlock", "revolutionize", "powered by AI", and "Welcome to...".
- Error messages say what happened and what to do next.

## Code
- Small modules with single responsibilities and domain-specific names. No generic names like utils.ts, helpers.ts, data, handleStuff.
- Comments only where the reason isn't obvious. No comments that narrate what the next line does. No commented-out code, no TODO litter, no console.log.
- Consistent error handling and one place where external API calls live.
- No unused dependencies, no over-engineering, no abstractions with a single use.
- Tests assert behaviour, with descriptive names.
- Commit messages are short, specific and in the imperative (for example "Reject purchases that exceed the monthly budget").

## README and Docs
- Plain, factual voice. No emoji headings, no hype, no feature lists padded with adjectives.
- Include a "Limitations" section that honestly states what is simulated (sandbox only) and what isn't built.
- Explain the design decision that the model proposes and deterministic code decides.
