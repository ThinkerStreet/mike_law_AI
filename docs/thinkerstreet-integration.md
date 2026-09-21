# ThinkerStreet Law integration

ThinkerStreet Law uses MikeOSS for legal workflows and the ThinkerStreet Flask
application as the public shell. The two applications remain independently
deployable so upstream MikeOSS updates can continue to merge cleanly.

## Routing

The public reverse proxy should route `/law` and `/law/*` to the Next.js
frontend. The Flask navigation links to `/law`; the legal frontend links back
to `NEXT_PUBLIC_THINKERSTREET_HOME_URL`.

Do not iframe the legal application. Same-origin reverse proxying preserves
keyboard navigation, file uploads, streaming responses, and authentication
cookies without maintaining two nested browser histories.

## Shared composer contract

The MikeOSS React composer remains the functional implementation because it
already understands legal document attachments, workflows, cancellation,
streaming, model selection, and accessible keyboard behavior.
`frontend/src/app/thinkerstreet.css` skins that composer using its accessible
combobox semantics, without forking the underlying interaction.

The Flask composer should use the same visual tokens and tier names. It should
send general prompts to the Flask chat endpoint; the Law route sends through
MikeOSS so its document and research tools remain available. This gives users
one composer design without duplicating Mike's legal workflow logic.

## Groq

MikeOSS already supports deployment-declared OpenAI-compatible endpoints.
Configure Groq in the backend without adding a provider-specific code path:

```dotenv
GROQ_API_KEY=replace-me
MIKE_MODEL_CONFIG_JSON={"models":[{"id":"thinkerstreet-fast","label":"Fast","provider":"openai-compatible","location":"cloud","apiModel":"llama-3.1-8b-instant","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"},{"id":"thinkerstreet-smart","label":"Smart","provider":"openai-compatible","location":"cloud","apiModel":"openai/gpt-oss-120b","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"},{"id":"thinkerstreet-deep","label":"Deep","provider":"openai-compatible","location":"cloud","apiModel":"qwen/qwen3-32b","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"}]}
```

Model identifiers are deployment configuration and should be verified against
the active Groq account before production deployment.

## Privacy boundary

Visual removal of history is not a no-retention implementation. MikeOSS writes
chat and document state to Supabase. A true ephemeral mode must bypass those
writes, keep the active conversation in browser/session memory, delete any
temporary uploaded-object bytes at request completion, and use a provider
configuration whose retention terms match the product representation.

Until that mode is implemented and tested, the UI must not claim that chats or
documents are never stored.
