---
name: ingest
description: Convert non-Markdown source files (PDF, Word, PowerPoint, Excel, images, audio, HTML, CSV/JSON/XML, ZIP, EPub) to Markdown with Microsoft markitdown before reading them, so tokens are spent on content and not on binary bulk. Use when a task needs the contents of such a file, when adding reference material to docs/design/reference or a spec, or when the product itself must parse uploaded documents at runtime.
---

# ingest: turn documents into Markdown before they cost tokens

Reading a PDF, Office file, or image directly is expensive and lossy: the bytes are not text, so
an agent burns tokens on encoding noise or cannot read them at all. markitdown
(https://github.com/microsoft/markitdown, MIT, Microsoft) converts them to clean Markdown that
carries the structure (headings, tables, lists) at a fraction of the tokens. Convert first, then
read the Markdown.

Run the decision ladder first. Convert only the file the task needs, only the pages or sheets
that matter, and read the result the same way you read any file: the part that answers the current
question, not the whole thing. Do not bulk-convert a folder "to have it".

## When to use

- A task needs what is inside a PDF, DOCX, PPTX, XLSX, image, audio file, HTML page, or data file.
- The owner hands over brand or reference material for `docs/design/reference/` or a spec.
- The product being built must accept and parse user-uploaded documents (then markitdown, or its
  Python API, becomes part of the product, not just a build-time helper).

## Install (only when you actually convert something)

Python 3.10 or higher. Node stays Groundwork's only always-on requirement; this is opt-in.

```bash
pip install 'markitdown[all]'          # everything
pip install 'markitdown[pdf,docx,pptx]' # or just the formats you need
```

## Convert, at the command line

```bash
markitdown report.pdf -o report.md     # write Markdown next to nothing you did not choose
markitdown report.pdf > report.md       # same, via redirect
cat report.pdf | markitdown             # from a pipe
```

Supported in: PDF, PowerPoint, Word, Excel, images (EXIF + OCR), audio (EXIF + transcription),
HTML, CSV, JSON, XML, ZIP (walks the archive), YouTube URLs, EPub.

## Convert, agent-native (MCP)

For tools that speak MCP, run the server and call one tool instead of shelling out:

```bash
pip install markitdown-mcp
markitdown-mcp                                   # STDIO (default)
markitdown-mcp --http --host 127.0.0.1 --port 3001  # local HTTP/SSE; localhost only
```

It exposes `convert_to_markdown(uri)` for `http:`, `https:`, `file:`, and `data:` URIs.

## Convert, inside product code

```python
from markitdown import MarkItDown
md = MarkItDown()
print(md.convert("upload.xlsx").text_content)
```

## Where the output goes

- Throwaway conversions (you just need to read something once): write to a scratch/temp path,
  never commit it.
- Durable reference the project should keep: `docs/design/reference/` or the relevant spec folder,
  and add the manifest row if it lives under `docs/` (docs/README.md rules).
- Do not commit the Markdown of a copyrighted or personal-data source without clearing it through
  `comply`. Converting does not change who owns the content.

## Security floor (never simplify away)

- Treat every file you convert as untrusted input at a trust boundary. markitdown parses many
  complex formats, which is real attack surface. In product code: cap file size, validate the type,
  run it where a crash or malformed file cannot take the app down, and handle conversion errors
  instead of trusting `text_content`.
- The optional LLM image-description feature (`llm_client` / `llm_model`) and Azure Document
  Intelligence send file content to a third party. That is a new data flow: flag it for `comply`
  before enabling it on any real or personal data.

## Verify

Conversion is not lossless. OCR and audio transcription can be wrong; complex tables and scanned
PDFs drift. When the numbers or wording matter, spot-check the Markdown against the source before
you rely on it, and say so if you could not (AGENTS.md honesty rule). ⚓
