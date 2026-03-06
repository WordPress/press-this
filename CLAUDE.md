# Press This - Agent Notes

## Maintenance Reminders

### Fallback script dependencies

When adding or removing `@wordpress/*` imports, update the fallback dependency list in
`includes/class-press-this-assets.php::get_script_dependencies()` to match the generated
`build/press-this-editor.asset.php`. The fallback is used if the asset file is missing.
