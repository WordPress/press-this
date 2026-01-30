# Pending Work

This document tracks pending features and improvements for the Press This plugin.

## Custom Post Type Support

### Implemented

- **`press_this_post_type` filter** - Allows changing the default post type when creating a new Press This post.

```php
// Example: Always use jetpack-social-note CPT
add_filter( 'press_this_post_type', function( $post_type, $data ) {
    return 'jetpack-social-note';
}, 10, 2 );

// Example: Conditionally use based on source URL
add_filter( 'press_this_post_type', function( $post_type, $data ) {
    if ( ! empty( $data['u'] ) && preg_match( '#(twitter\.com|x\.com)/#i', $data['u'] ) ) {
        return 'jetpack-social-note';
    }
    return $post_type;
}, 10, 2 );
```

**Parameters:**
- `$post_type` (string) - The post type to create. Default `'post'`.
- `$data` (array) - The scraped data from the source URL (contains `u`, `t`, `s`, `i` keys).

### Not Yet Implemented

- **CPT-based block restrictions** - The editor does not yet respect block restrictions defined by custom post types. For example, if a CPT like `jetpack-social-note` has a limited set of allowed blocks, Press This will still show all blocks in its editor.

  Implementing this would require:
  1. Passing the post type to the JavaScript editor configuration
  2. Querying the CPT's allowed blocks via `allowed_block_types_all` filter
  3. Filtering the block inserter in the React editor to only show allowed blocks
  4. Potentially respecting `template` and `template_lock` settings from the CPT registration
