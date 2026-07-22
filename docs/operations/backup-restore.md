# Backup and restore runbook

<!-- Required by the `deliver` skill when the product holds persistent data: this file must exist
     AND the restore must have been performed once, for real, before first delivery. An untested
     restore is a hope, not a backup. The `maintain` quarterly audit re-proves the restore. -->

## What is backed up

- **Data:** <the persistent data that exists (database, uploaded files, config) and where it lives>
- **Schedule:** <how often a backup runs and what triggers it>
- **Location:** <where backups are stored, the retention period, and who can reach them>

## Backup procedure

1. <step>

## Restore procedure

<!-- The steps to bring data back from a backup. This is the half that matters in a crisis. -->

1. <step>

## Restore proof

- **Last real restore:** <date> - <who ran it, into which environment, and the outcome>

<!-- Update the line above every time the restore is proven. A blank value here means untested. -->
