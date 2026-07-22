# Monitoring runbook

<!-- Required by the `maintain` skill: the first maintenance session confirms the minimum below
     exists, or creates it and records it here. The goal is that breakage is found before a user
     reports it. -->

## Errors

- **Where captured:** <error tracking service or log alerts, per stack>
- **Who is alerted, how:** <channel and the threshold that triggers an alert>

## Heartbeat

- **Critical flow watched:** <the one flow whose failure means the product is down>
- **How:** <uptime check or synthetic run, and its interval>

## Background work

<!-- Jobs and integrations fail silently by default. Make their failure visible. -->

- **What runs in the background:** <jobs, queues, scheduled tasks, third-party integrations>
- **How failure surfaces:** <how a failed run is made visible rather than swallowed>
