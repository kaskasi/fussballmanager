# Cloud Save M1 — Ops (~500 users)

**PRD:** [18_cloud_save_m1.md](prd/18_cloud_save_m1.md)

## Storage tier

- **Latest-only** per `sync_code_hash` (no version history in DB).
- Plan **~2–3 MB gzip** per active user → 500 users ≈ **1–1.5 GB** if everyone syncs once.
- Supabase **Free** (500 MB DB) is tight; **Pro** or external Storage bucket if blobs grow.

## Monitoring (manual / dashboard)

| Signal | Action |
|--------|--------|
| Edge Function 5xx rate | Check `SYNC_CODE_PEPPER`, service role, migration applied |
| `blob_too_large` 413 | User save > 8 MB — PRD 18 compact + export diet |
| `rate_limited` 429 | Normal under abuse; raise window if false positives |
| p95 `byte_size` in `cloud_saves` | Trigger save-compact tuning |

## Deploy checklist

1. Run SQL migration `supabase/migrations/20251010120000_cloud_saves.sql`.
2. Deploy function: `supabase functions deploy cloud-save`.
3. Set secret `SYNC_CODE_PEPPER` (32+ random bytes, never in repo).
4. Vite build env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. CORS: function allows `*` for SPA; restrict origin in production if needed.

## Security

- RLS enabled, no public policies — only service role in Edge Function.
- Sync code = bearer secret; hash + rate limit on server.

## Cost envelope (500 MAU assumption)

~400 pushes + 100 pulls/day, negligible CPU; watch **egress** on full blob downloads.
