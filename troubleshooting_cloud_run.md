# Troubleshooting Cloud Run 500 Errors

The "500 Internal Server Error" on your live site indicates that the server is running but failing to execute the request. Specifically, the error "Failed to fetch inventory" identifies that the **Database Connection is failing**.

## Likely Causes

1.  **Missing GitHub Secret**: The `DATABASE_URL` secret might be missing or empty in your GitHub repository, so it wasn't passed to Cloud Run during deployment.
2.  **Network Restrictions**: Your database (Supabase/PostgreSQL) might block connections from Google Cloud IPs.
3.  **SSL Configuration**: The default SSL settings might reject the connection if using a custom database provider.

## Steps to Fix

### 1. Check Cloud Run Logs
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/run).
2.  Select your service (`big-deck-app`).
3.  Click on the **Logs** tab.
4.  Look for error messages starting with `[DB]`. You will likely see:
    *   `[DB] ✗ DATABASE_URL environment variable is not set`
    *   `[DB] ✗ Unexpected pool error: password authentication failed`
    *   `[DB] ✗ Unexpected pool error: no pg_hba.conf entry for host...` (SSL/IP issue)

### 2. Verify GitHub Secrets
1.  Go to your GitHub Repository > **Settings** > **Secrets and variables** > **Actions**.
2.  Ensure `DATABASE_URL` is set and matches the connection string in your local `.env`.
3.  Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also set.

### 3. Check Database Network Settings (Supabase)
If using Supabase:
1.  Go to Supabase Dashboard > **Settings** > **Database** > **Network Restrictions**.
2.  Ensure "Allow access from anywhere" (0.0.0.0/0) is enabled, OR add Google Cloud IPs (harder to manage).
3.  Ensure "Use connection pooling" is configured correctly if utilizing the pooler port (6543) vs direct port (5432).

### 4. Trigger a Redeploy
If you updated secrets or settings:
1.  Go to the **Actions** tab in GitHub.
2.  Select the **Deploy to Cloud Run** workflow.
3.  Click **Run workflow** (if available) or push a small change (e.g., update `README.md`) to trigger it again.
