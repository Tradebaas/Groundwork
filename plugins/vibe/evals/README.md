# Evals for the vibe plugin

One directory per case; each case seeds its workspace with `fixture.sh`, so every run needs
`--scaffold`. Every case edits a file or runs a command, which the eval runner only allows when
granted on the command line. From the plugin root:

```
claude plugin eval . --scaffold --allow-tools Write Edit "Bash(git *)" "Bash(node *)" "Bash(npm test *)"
```

Graders are `regex` and `tool_used` wherever the outcome is a file or a tool call,
and one `llm` rubric per case for the reply itself. Results land in `results/`, which is ignored.
