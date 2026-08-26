# TEMPLATE: `<stack>` standards

<!-- The `stack` skill writes this as docs/standards/<stack>.md, from live research (skill section
     2). The floor table stays; everything else is yours. Replace what is in <angle brackets>, and
     delete the worked answers at the bottom once your own are filled in. -->

## The floor

Six classes of risk. Every product carries all six; what changes per stack is the answer, never the
list. **Each row is answered or the gates do not read green.**

| Class | The risk it covers | Form | Answer |
|---|---|---|---|
| `builds` | It does not assemble or deploy, and finds out in production | | |
| `behaves` | It does not do what it claims, and nothing says so before a user does | | |
| `analyzed` | Defects a machine can see are shipped because no machine looked | | |
| `dependencies` | Third-party code arrives with known holes, unknown licences, or unrecorded | | |
| `secrets` | Keys, tokens and passwords ship inside the product | | |
| `renders` | What a person actually sees is broken, unreadable or unusable | | |

Three answer forms, and no fourth:

- **command** - what CI runs: a shell line, or this host's own task. It has to exist as a live
  stage in a workflow, never as a comment.
- **`not applicable`** - plus the reason. Use it when the class genuinely cannot apply here, never
  when it is merely inconvenient.
- **`manual`** - plus the named check and who runs it, and a `defer:` marker at the site. This is
  what the `stack` skill's platform route already requires of a gate with no platform equivalent:
  a named manual check, never a silent drop.

A waived class is reported on the board and on the enforcement line, with its reason. That is the
point of the form: a floor with holes in it is allowed, and is never quiet about them.

## Worked answers

<!-- Delete this section. It is here so the shape is clear on two stacks that share no tooling. -->

| Class | TypeScript on Node | Microsoft Power Platform |
|---|---|---|
| `builds` | **command** `npm run build` | **command** the `PowerPlatformPackSolution@2` task, then the import task |
| `behaves` | **command** `npm test` | **manual** - Test Engine was deprecated effective April 2026 and Microsoft points at the Power Platform Playwright samples instead. A project that has not adopted them yet answers `manual` with the named regression script and a `defer:` marker, rather than claiming a runner it does not have |
| `analyzed` | **command** `tsc --noEmit` and `eslint .` | **command** the `PowerPlatformChecker@2` task - static analysis against Microsoft's rule set, emitting SARIF |
| `dependencies` | **command** `npm audit --audit-level=high` and `npm sbom --sbom-format=cyclonedx` | **not applicable** - a solution declares dependencies on other solutions and connectors, and no vulnerability feed exists for those. Connector governance through DLP policies is the control instead, and it is a policy, not a build step |
| `secrets` | Groundwork's own gate, with this stack's file extensions added to `extraCodeExtensions` in `checks/config.json` | Groundwork's own gate over the unpacked solution, with environment variables and Key Vault references as the pattern that replaces embedded values |
| `renders` | **command** `npx -y impeccable@latest detect <the surfaces this project ships>` | **manual** - the accessibility checker in the studio, run per app before release, with a `defer:` marker naming it |

Sources, read 2026-08-26, primary only: `npm sbom` and its `cyclonedx` format from the npm CLI
docs (docs.npmjs.com/cli/v11/commands/npm-sbom); the Test Engine deprecation, effective April 2026,
and the Playwright samples that replace it from Microsoft Learn's "Important changes (deprecations)
coming in Power Platform"; the two task names from Microsoft Learn's Power Platform Build Tools
task reference, itself updated 2026-08-19. Re-read them before copying: this table is dated
evidence, not a standing recommendation, and the tooling in it moves faster than this file does.

## <Everything else this stack needs>

<!-- `stack` section 2 owns what goes here: conventions, project structure, the ecosystem's own
     idioms, the mistakes builders actually make on this stack today, and the commands above with
     what they do. The floor table is the part checks/ reads; this part is for the person. -->
