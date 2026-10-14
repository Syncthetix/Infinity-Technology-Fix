# Local catalog management

The local catalog backend uses Python 3's standard library and SQLite; it needs no package installation or internet connection.

1. Double-click `start-local.bat`. It starts the local server in a minimized window, waits for it to respond, and opens the admin page; if the server is already running, it simply opens the page. Keep the minimized server window open while using the site.
2. Open `http://127.0.0.1:8765` and select the small **Admin** link at the bottom of the storefront, or go directly to `http://127.0.0.1:8765/admin`.
3. The local admin dashboard signs in automatically when opened; no login page or password is needed. This is limited to the local server running on this computer.
4. Add or edit a listing, select its storefront section, and optionally upload an image. Use JPEG, PNG, WEBP, or GIF images up to 8 MB.
5. Open `http://127.0.0.1:8765` to view the storefront. Visible catalog changes appear in the selected section.

The hosted dashboard is intentionally public: anyone can view, add, edit, hide, or delete catalog listings. Do not expose the local backend to the public internet.

The first startup imports the current phone, laptop, gadget, repair, and spare-part listings into the editable catalog. Data is stored in `catalog.sqlite3`; uploaded images are stored in `uploads`. Keep both safe when backing up the site.

This development setup binds only to `127.0.0.1`, so it is available on this computer and is not a public website or a shared online admin system. Online use requires hosting and additional deployment security.

## Hosted Admin Dashboard

GitHub Pages only serves static files; it cannot run this project's `/api` backend. If the storefront is opened on GitHub Pages, the admin page cannot load or save listings. Deploy the whole site to Vercel instead. This project includes a Vercel serverless API and `vercel.json` URL routing for `/admin`.

**Public editing warning:** the hosted editor has no login. Anyone who can reach the deployment can view and change the catalog, including deleting listings. Use this only if public editing is intended.

1. In Vercel, choose **Add New → Project**, connect the GitHub account that contains this project, and import its repository. Keep the project root set to the repository root. Vercel serves the HTML/CSS/JavaScript files and deploys `api/[...route].js` as a serverless function; no separate build command is needed.
2. Create a Supabase project. In its SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) to create the private catalog table and public-read image bucket.
3. In the Vercel project settings, add these **private** environment variables for Production (and Preview if needed):
   - `SUPABASE_URL` — the Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the server-side `service_role` key from Supabase's legacy API keys. Never add this key to browser code or commit it.
4. Redeploy the Vercel project after saving its environment variables. Open the Vercel deployment URL (not the GitHub Pages URL) and visit `/admin` or `/admin.html` to edit the public catalog.
5. To copy the current local listings into Supabase, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` temporarily in PowerShell from the project folder, then run:
   ```powershell
   py -3 .\scripts\import_supabase_catalog.py
   Remove-Item Env:SUPABASE_URL, Env:SUPABASE_SERVICE_ROLE_KEY
   ```
   The import copies existing uploaded images to the Supabase bucket and keeps storefront image paths for files already deployed with the site. Run this SQL in Supabase afterward so new listing IDs continue above the imported IDs:
   ```sql
   select setval(
     pg_get_serial_sequence('public.catalog_items', 'id'),
     coalesce(max(id), 1),
     max(id) is not null
   )
   from public.catalog_items;
   ```
The local `catalog.sqlite3` and the Supabase catalog are separate; edits on the hosted site are stored in Supabase. To use a custom domain, attach it to the Vercel project and use that domain instead of the GitHub Pages URL.

The Vercel deployment excludes the local SQLite database, local uploads, Python server, and setup-only scripts using [`.vercelignore`](./.vercelignore).
