# Press This - Agent Notes

## Repository

- Default branch: `trunk` (not `main`)

## Maintenance Reminders

### Fallback script dependencies

When adding or removing `@wordpress/*` imports, update the fallback dependency list in
`includes/class-press-this-assets.php::get_script_dependencies()` to match the generated
`build/press-this-editor.asset.php`. The fallback is used if the asset file is missing.

### Distribution package

`npm run build:dist` and the Build Release workflow both package the plugin with
`bin/build-dist.js`, which copies everything except what `.distignore` lists. When adding
a file or folder at the repository root, add it to `.distignore` if it is dev-only, or to
`EXPECTED_TOP_LEVEL` in `bin/build-dist.js` if it must ship. The build fails until you do.

### Versioning and releases

NEVER update the `Stable tag` field in `readme.txt` unless publishing a new **stable** release.
Pre-release versions (beta, alpha, RC) must only bump the version in:
- `press-this-plugin.php` (plugin header `Version:` and `PRESS_THIS__VERSION` constant)
- `package.json`
- `package-lock.json`

The `Stable tag` in `readme.txt` controls what wordpress.org serves to all users.
