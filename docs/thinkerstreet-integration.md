# ThinkerStreet Law integration

ThinkerStreet Law uses MikeOSS for legal workflows. The existing ThinkerStreet
Flask application can remain private and does not need to be copied into this
public AGPL repository.

Keep the applications independently deployable so upstream MikeOSS updates can
continue to merge cleanly:

- Flask serves the ThinkerStreet landing page and general AI routes.
- MikeOSS runs as its own Next.js frontend and Express backend.
- A private deployment proxy presents MikeOSS under the site's `/law` path.

Do not copy the MikeOSS source tree into Flask's `templates/` or `static/`
folders. It is not a Flask blueprint or a static bundle; its server-rendered
routes, streaming API, uploads, authentication, and backend services must run.

## Recommended same-domain routing

Run the services privately on separate internal ports or containers:

- Flask: `127.0.0.1:5000`
- Mike frontend: `127.0.0.1:3000`
- Mike backend: its normal private service address

Configure Nginx, Caddy, Traefik, or the hosting platform's proxy so:

- `/` and the existing ThinkerStreet routes go to Flask.
- `/law` and `/law/*` go to the Mike frontend.
- Mike's API path goes to the Mike backend according to its deployment guide.

The Flask Law card or route only needs to link to `/law`. The legal frontend
links back to `NEXT_PUBLIC_THINKERSTREET_HOME_URL`.

Same-origin reverse proxying is preferable to an iframe because it preserves
keyboard navigation, file uploads, streaming responses, cookies, and normal
browser history.

A simple redirect is also possible if path-prefix deployment is inconvenient:
Flask's `/law` route can redirect to a private deployment such as
`https://law.example.com`. This is easier, but it uses a separate hostname.

## Composer

The MikeOSS React composer remains the functional Law composer because it
already understands document attachments, workflows, cancellation, streaming,
model selection, and accessible keyboard behavior.
`frontend/src/app/thinkerstreet.css` skins that composer using its accessible
combobox semantics without forking the underlying interaction.

The private Flask application may keep its existing composer for general AI.
Use the same ThinkerStreet colors and Fast/Smart/Deep labels in both
applications; do not copy Mike's legal workflow logic into Flask.

## Groq

Do not commit the Groq key. Supply the existing secret independently to the
Mike backend process or container:

```dotenv
GROQ_API_KEY=your-existing-deployment-secret
MIKE_MODEL_CONFIG_JSON={"models":[{"id":"thinkerstreet-fast","label":"Fast","provider":"openai-compatible","location":"cloud","apiModel":"llama-3.1-8b-instant","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"},{"id":"thinkerstreet-smart","label":"Smart","provider":"openai-compatible","location":"cloud","apiModel":"openai/gpt-oss-120b","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"},{"id":"thinkerstreet-deep","label":"Deep","provider":"openai-compatible","location":"cloud","apiModel":"qwen/qwen3-32b","baseUrl":"https://api.groq.com/openai/v1","apiKeyEnv":"GROQ_API_KEY"}]}
```

Environment variables are process-scoped. If Flask and MikeOSS run in different
containers or services, both may reference the same secret in the deployment
platform, but MikeOSS does not automatically inherit Flask's process
environment.

Model identifiers are deployment configuration and should be checked against
the models currently enabled for the Groq account before production use.

## Privacy boundary

Visual removal of history is not a no-retention implementation. MikeOSS writes
chat and document state to Supabase. A true ephemeral mode must bypass those
writes, keep the active conversation in browser/session memory, delete any
temporary uploaded-object bytes at request completion, and use a provider
configuration whose retention terms match the product representation.

Until that mode is implemented and tested, the UI must not claim that chats or
documents are never stored.
