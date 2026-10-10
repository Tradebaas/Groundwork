# Axis A reference: the thirteen smells, and the platform reading

Baseline of thirteen smells to check by name, beyond whatever the standards say:

1. Mysterious name: the name needs the implementation to be understood.
2. Duplicated code: the same knowledge written twice.
3. Feature envy: a function that mostly manipulates another module's data.
4. Data clumps: the same group of values traveling together unbundled.
5. Primitive obsession: domain concepts passed around as bare strings and numbers.
6. Repeated switches: the same case analysis dispatched in several places.
7. Shotgun surgery: one conceptual change forcing edits in many files.
8. Divergent change: one file edited for many unrelated reasons.
9. Speculative generality: hooks and options for a future nobody scheduled.
10. Message chains: reaching through object after object to get one value.
11. Middle man: a layer that only forwards to the next layer.
12. Refused bequest: inheriting an interface and ignoring most of it.
13. Hedged naming: a name that records the edit history instead of the thing (`utils2`,
    `enhanced_*`, `*_v2`, `*_final`, a `FooManager` sitting next to `Foo`). Not the same as a
    mysterious name: this one is clear enough, it is evasive. It exists because nobody chose
    between the old version and the new one, so both ship. The fix is the choice: replace the
    original, or name what actually differs about this one.

**On a platform stack.** When the stack file's header declares a hosted platform, the seven that
describe object structure (3, 4, 5, 6, 10, 11, 12) go quiet against solution XML, flow
definitions and generated exports. The other six survive the translation and are where the
findings are: a flow named `New flow 1`, the same logic copied into three flows, a solution
edited for unrelated reasons, one change forcing edits across a dozen artifacts, options nobody
asked for, and `Flow - Copy` shipping beside the original. The subject of the review is what the
platform actually runs - flows, apps, business rules, security roles, connector permissions,
environment variables - read in the platform's own terms, with the export diff treated as the
transport it is. The discriminator matters here: churn the exporter produced (reordered nodes,
regenerated ids, timestamps) is not a finding, while a security role granting more than the spec
asked for is one whether or not the diff makes it obvious. The standards file's platform craft
section (environment strategy, naming, blessed and deprecated patterns, connector governance) is
the written standard this axis holds it to.
