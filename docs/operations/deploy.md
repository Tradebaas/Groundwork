# Deploy runbook

<!-- Groundwork's own release route, written when v0.1.0 was cut. `begin` replaces this file with
     the blank `TEMPLATE-DEPLOY.md`, so a new project never inherits it. Maintainers of Groundwork
     itself: this is the file `deliver` §1.3 points at, and it is the only place the route and its
     undo are written down. -->

## Target

There is no server and no build step. What ships is the repository itself, on two surfaces:

- **The tagged release** at `https://github.com/Tradebaas/Groundwork/releases`, which is what a copy
  is taken from and what `CHANGELOG.md` tells an existing copy to read forward from.
- **The explainer** at `https://tradebaas.github.io/Groundwork/`, which GitHub Pages rebuilds from
  `index.html` on every push to `main`. It is not part of the release step and needs no action.

- **Hosting / platform:** GitHub (repository, Releases, Pages). No runtime dependency, no hosting
  account of our own, nothing to provision.
- **Credentials:** none are held by this project. Cutting a release needs push rights on
  `Tradebaas/Groundwork` and an authenticated `gh` (`gh auth status`). CI uses the token GitHub
  gives the workflow; there are no repository secrets to rotate.

## Deploy

1. **Walk `deliver` §0 on the exact commit that will ship.** Re-check it on the current head, never
   on the head an earlier session checked: CI green on that commit, no blocking row in
   `docs/compliance/COMPLIANCE.md`, private vulnerability reporting enabled
   (`gh api repos/Tradebaas/Groundwork/private-vulnerability-reporting`), `main` protected.
2. **Pick the version** from the commits since the last tag, per Conventional Commits: breaking to
   major, `feat` to minor, `fix` to patch. Below 1.0 a moved file or a renamed check is a minor, and
   `CHANGELOG.md` says so in its own header.
3. **Date the heading, by PR.** `main` is protected, so branch (`release/vX.Y.Z`), change
   `## vX.Y.Z - unreleased` to `## vX.Y.Z - <date>`, commit with a `Traces-to:` trailer, push, open
   the PR with the template sections filled, wait for `gate` and `trace`, merge by rebase. A
   dateless heading is this repo's sign that a release is written but not out, so this is the step
   that makes it out.
4. **Tag the merge commit.** Pull `main`, then `git tag -a vX.Y.Z <sha> -m "<what this release
   is>"` (or `-F -` for a longer message; without either, git opens an editor and a non-interactive
   session hangs there), then `git push origin vX.Y.Z`. Annotated, never lightweight: the tag
   carries a message and an author, and `gh release create --verify-tag` expects it to exist.
5. **Publish the release** from the changelog section for this version, so the notes and the
   changelog cannot drift: `gh release create vX.Y.Z --title vX.Y.Z --notes-file <that section>
   --verify-tag`.

## Verify

- **Live URL:** the release page for the tag, and `https://tradebaas.github.io/Groundwork/`.
- **Smoke checks.** The product is a copy someone takes, so the copy is what gets exercised, not the
  working tree it was cut from:
  1. Unpack the release tarball
     (`curl -sL https://github.com/Tradebaas/Groundwork/archive/refs/tags/vX.Y.Z.tar.gz`) into a
     scratch directory. Inside it, run **every** self-test the `gate` job lists in
     `.github/workflows/ci.yml`, then `node checks/check.mjs`. The list lives there and not here
     on purpose: this step named one suite file until v0.2.0, and a split had made that a third
     of the tests while the sentence still said all of them. Expect the self-tests green, the
     checks green, and enforcement reporting hooks and CI **not** armed with the two commands
     that arm them: that is what a fresh copy should say.
  2. `.claude/skills` is still a symlink to `../.agents/skills` in the unpacked archive. An archive
     that flattened it would hand every copy a duplicated skill library.
  3. `node checks/progress.mjs` in that copy ends with `now: run begin`.
  4. The explainer answers 200 and its stat strip matches the repo it was built from.

## Rollback

Nothing is served from a server, so undoing a release withdraws a pointer rather than restoring
state: a copy someone already took keeps working, which is the point of the design.

1. `gh release delete vX.Y.Z --yes` removes the release page.
2. `git push origin :refs/tags/vX.Y.Z` then `git tag -d vX.Y.Z` removes the tag remotely and
   locally.
3. Put the changelog heading back to `unreleased` by PR, the same way step 3 dated it.
