# ThinkerStreet Law — Flask drop-in

Copy the contents of `Flasksetup/app/` into the matching `app/` directory in
your private Flask project. Existing files are not included or replaced.

Register the blueprint during application creation:

```python
from app.routes.mikeoss_law import mikeoss_law

app.register_blueprint(mikeoss_law)
```

The module provides:

- `GET /law` — the ThinkerStreet Law page.
- `POST /api/law/chat` — a server-side Groq request; the API key is never sent
  to the browser.
- Up to three conversations in `sessionStorage`; closing the browser session
  removes them according to browser behavior.
- No chat database or file writes in this module.

Required environment variable:

```dotenv
GROQ_API_KEY=your-secret
```

Optional model overrides:

```dotenv
GROQ_FAST_MODEL=llama-3.1-8b-instant
GROQ_SMART_MODEL=openai/gpt-oss-120b
GROQ_DEEP_MODEL=qwen/qwen3-32b
```

Confirm model availability in the active Groq account before deployment.

The template expects the existing ThinkerStreet `base_AI.html` and its normal
`head`, `content`, and `scripts` blocks. If that base template exposes a token
as `<meta name="csrf-token" content="...">`, `law.js` automatically sends it
in the `X-CSRFToken` header. Otherwise, adapt the header to your application's
existing CSRF convention or exempt only this JSON endpoint.

This is a lightweight Flask adaptation. It does not include MikeOSS projects,
Supabase storage, Word integration, document parsing, or CourtListener tools.
Those require the full MikeOSS services.

See `AGPL_NOTICE.md` before deployment.
