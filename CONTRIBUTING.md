# Contributing

Thanks for helping! The most useful contribution is a **new preset**.

## Adding a preset

A preset is accepted only when the operator or provider **publicly documents** its algorithm. Please include:

1. A link to the official documentation or the operator's own open-source verifier (no screenshots, no forum guesses).
2. The exact key/message construction, how bits become a number, and the house-edge formula.
3. At least one test vector: inputs and the result shown on the operator's own verification page, with a link.
4. A row in the README presets table.

Keep the core dependency-free and working in both browsers and Node 18+. Run `npm test` before opening a PR.

## Bugs

Open an issue with the inputs, the output you expected (and where that expectation comes from), and what you got.
