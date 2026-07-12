# Marketplace Notes Feature

This add-on creates a `/marketplace` page for StudyHub without adding new `.ejs` view files.

## Files added

- `routes/marketplace.js` — all marketplace routes and HTML rendering are kept in this route file.
- `database/marketplace_notes.sql` — table creation SQL.
- `database/migrate_marketplace.js` — Node migration helper.
- `uploads/marketplace/.gitkeep` — keeps the upload folder in Git while ignoring uploaded files.

## Files changed

- `app.js` — mounts the new `/marketplace` route.
- `package.json` / `package-lock.json` — adds `multer` and the `migrate:marketplace` script.
- `.gitignore` — ignores uploaded marketplace files.

No new marketplace `.ejs` files are used. The page links to the existing `/css/style.css` and reuses StudyHub's existing classes such as `card`, `form-group`, `btn`, `btn-danger`, and `helper-text`.

## Permissions

- Students can add notes.
- Students can edit and delete only their own notes.
- Admins can add, edit, and delete their own notes.
- Admins can also delete notes created by other users.

## Setup

From the `studyhub` folder:

```powershell
npm install
npm run migrate:marketplace
npm start
```

Or run `database/marketplace_notes.sql` manually in MySQL Workbench.

## Seeded accounts found

The original project includes this seeded admin account:

- Username: `admin1`
- Password: `Pass123!`

No seeded guest/student account was found in the project files. Student accounts can be created through the Sign Up page.
