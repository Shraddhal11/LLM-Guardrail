# Plan: multiple upstream providers (Gemini first)

Status: planned, not built. Phase 11 in `Docs/Next_Build_Plan.md`.

## Today
- One upstream for everything: `UPSTREAM_BASE_URL` (the shared GPU node).
- Callers send their own model key in `Authorization`; the proxy forwards it unchanged.

## Goal
- A list of providers in config. Adding one is a config entry, not a code change.
- First entry: Gemini, through its OpenAI-compatible endpoint.

## Design

`config/providers.yaml`:
```yaml
providers:
  - name: gpu-node
    base_url: https://ai-gpu-node.tailfa114b.ts.net/api/v1
    default: true
  - name: gemini
    base_url: https://generativelanguage.googleapis.com/v1beta/openai
    model_prefix: "gemini/"        # request model "gemini/<model-id>" routes here
```

Routing rule, in order:
1. Header `X-Provider: <name>` if present.
2. Else the model's prefix (`gemini/...`) picks the provider.
3. Else the provider marked `default: true`.
4. Unknown provider name → 400.

The `model` sent upstream has its prefix removed (`gemini/x` → `x`).

## Keys
- Callers send their own provider key in `Authorization: Bearer <key>`. Nothing is stored on our side, same as today.

## Safety
- Upstream URLs come only from the config list. Never from a request header, so the proxy can't be pointed at arbitrary hosts.

## Steps (in order, one at a time)
1. Add `config/providers.yaml` and a loader in `pii_proxy/config.py`.
2. Route `/v1/chat/completions` and `/v1/completions` through the resolver. Embeddings keep the default provider for now.
3. Log the provider name on each event (add a `provider` column in a small v1.2 patch, same pattern as `v1_1_anonymized_text.sql`).
4. Test with Gemini: one non-streaming and one streaming call through the proxy.

## Done when
- A request with `model: "gemini/<model-id>"` reaches Gemini and returns a reply.
- The same user's events show `provider = gemini`.
- A request with an unknown `X-Provider` returns 400.

## Open checks before building
- Confirm the Gemini model IDs we'll use from Google's current docs (don't assume names).
- Confirm streaming works through the OpenAI-compatible endpoint.
