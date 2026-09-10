# SolRadar

pump.fun / Solana token trending board + AI rug check.

## Folder structure (must stay exactly like this)

```
solradar/
├── index.html        <- the whole front end
└── api/
    └── analyze.js    <- serverless function; THIS path is what creates /api/analyze
```

`analyze.js` MUST live inside an `api/` folder. If it sits next to `index.html`
with no `api/` folder, the endpoint does not exist and the AI panel returns 404.

## Deploy (with the api/ folder intact)

Easiest reliable path from mobile is GitHub → Vercel:

1. Create a repo. When adding the function, name the file **`api/analyze.js`**
   (type the `/` — GitHub creates the folder for you). Add `index.html` at the root.
2. In Vercel: Add New → Project → Import that repo.
3. Project → Settings → Environment Variables → add the API key (see below) → Save.
4. Deployments → latest → Redeploy (env vars only apply on a new build).

On a laptop you can instead drag the whole `solradar` folder onto vercel.com/new.

## The API key

- Add it in **Vercel → Settings → Environment Variables**, never in any file.
- Name: `ANTHROPIC_API_KEY`  ·  Value: your key from console.anthropic.com
- The account needs billing/credit or calls fail even with the key set.
- This name is only visible to you in Vercel. It is never shown to site visitors,
  and the UI never names the AI provider.

## Verify it worked

After deploying, open the project's **Functions** tab (or the deployment's Source).
You should see `api/analyze` listed. If the list is empty, the `api/` folder didn't
make it into the deploy — that is the 404 cause. Fix the folder and redeploy.

## Notes on hiding the provider

The website UI and the AI's answers never reveal which model is used. However the
source file `api/analyze.js` necessarily calls the provider's API endpoint, so anyone
reading the source could see it. If you want the vendor fully concealed, keep the
GitHub repo **private**.

The model is set at the top of `api/analyze.js`. Everything is heuristic — a clean
check is not a safety guarantee. Not financial advice.

## If the AI errors after the key is set

If the panel shows "the AI service returned an error", the two usual causes are
(1) no billing/credit on the account, or (2) the model name has changed. The model
is the `MODEL` value at the top of `api/analyze.js` — if it's rejected, update it to
a current model id from Anthropic's model list and redeploy.
