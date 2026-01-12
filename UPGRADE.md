# Press This 2.0 Upgrade Guide

This document provides guidance for developers who have built extensions or customizations for Press This 1.x and need to update for Press This 2.0.

## Overview

Press This 2.0 introduces the Gutenberg block editor while maintaining backward compatibility with existing hooks and filters. Most extensions should continue working without modification.

## Breaking Changes

### Server-Side Scraping Removed

**What Changed:**
- The `fetch_source_html()` method has been removed from `WP_Press_This_Plugin`
- The `source_data_fetch_fallback()` method has been removed
- All content extraction now happens client-side in the bookmarklet

**Impact:**
- Extensions that relied on server-side URL fetching will no longer work
- Extensions that modified scraped data via the `press_this_data` filter will continue to work, as data is still passed through this filter

**Migration:**
If your extension performed server-side content extraction, you'll need to:
1. Move extraction logic to JavaScript in the bookmarklet, or
2. Use the `press_this_data` filter to augment data after client-side extraction

### TinyMCE Replaced with Block Editor

**What Changed:**
- TinyMCE initialization code has been removed
- The editor is now a React-based Gutenberg block editor
- Editor content is serialized as block markup

**Impact:**
- Extensions that added TinyMCE buttons or plugins will no longer work
- Extensions that manipulated TinyMCE content directly need updating

**Migration:**
- Use the `press_this_allowed_blocks` filter to add custom blocks
- Content is now stored in Gutenberg block format

## New Hooks and Filters

### press_this_allowed_blocks

Control which blocks are available in the Press This editor.

```php
/**
 * Add custom blocks to Press This.
 *
 * @param string[] $blocks Array of allowed block type names.
 * @return string[] Modified array of block names.
 */
add_filter( 'press_this_allowed_blocks', function( $blocks ) {
    // Add the gallery block
    $blocks[] = 'core/gallery';

    // Add a custom block
    $blocks[] = 'my-plugin/custom-block';

    return $blocks;
} );
```

**Default blocks:**
- `core/paragraph`
- `core/heading`
- `core/image`
- `core/quote`
- `core/list`
- `core/list-item`
- `core/embed`

### press_this_post_format_suggestion

Modify the auto-suggested post format based on content analysis.

```php
/**
 * Customize post format suggestions.
 *
 * @param string $suggested_format The auto-detected format (video, quote, link, or empty).
 * @param array  $data             Scraped data from the source page.
 * @return string Modified format suggestion.
 */
add_filter( 'press_this_post_format_suggestion', function( $suggested_format, $data ) {
    // If source contains 'podcast', suggest audio format
    if ( ! empty( $data['u'] ) && strpos( $data['u'], 'podcast' ) !== false ) {
        return 'audio';
    }

    // If there are many images, suggest gallery format
    if ( ! empty( $data['_images'] ) && count( $data['_images'] ) > 5 ) {
        return 'gallery';
    }

    return $suggested_format;
}, 10, 2 );
```

**Auto-detection logic:**
- YouTube/Vimeo/Dailymotion URLs suggest "video" format
- Selected text over 50 characters suggests "quote" format
- URL-only content (no images/embeds) suggests "link" format

## Preserved Hooks

All existing hooks from Press This 1.x continue to work:

### press_this_redirect_in_parent

Control whether the redirect after save happens in the parent window.

```php
add_filter( 'press_this_redirect_in_parent', '__return_true' );
```

### press_this_save_post

Filter post data before saving.

```php
add_filter( 'press_this_save_post', function( $post_data ) {
    // Modify post data before save
    $post_data['post_title'] = 'Prefix: ' . $post_data['post_title'];
    return $post_data;
} );
```

### press_this_save_redirect

Filter the redirect URL after saving.

```php
add_filter( 'press_this_save_redirect', function( $url, $post_id, $status ) {
    if ( $status === 'publish' ) {
        return admin_url( 'edit.php?post_type=post' );
    }
    return $url;
}, 10, 3 );
```

### enable_press_this_media_discovery

Toggle media discovery/scraping.

```php
// Disable image and embed extraction
add_filter( 'enable_press_this_media_discovery', '__return_false' );
```

### press_this_data

Filter the complete scraped data array.

```php
add_filter( 'press_this_data', function( $data ) {
    // Add custom data
    $data['custom_field'] = 'value';

    // Modify extracted content
    if ( ! empty( $data['_images'] ) ) {
        // Remove first image
        array_shift( $data['_images'] );
    }

    return $data;
} );
```

### press_this_suggested_html

Filter the default HTML templates for content.

```php
add_filter( 'press_this_suggested_html', function( $html, $data ) {
    // Customize the blockquote template
    $html['quote'] = '<blockquote class="my-quote">%1$s</blockquote>';

    return $html;
}, 10, 2 );
```

### shortcut_link

Customize the bookmarklet URL.

```php
add_filter( 'shortcut_link', function( $link ) {
    // Add custom parameter
    return add_query_arg( 'custom', '1', $link );
} );
```

## New Data in press_this_data

The scraped data array now includes additional fields:

### _jsonld

JSON-LD structured data extracted from the page:

```php
$data['_jsonld'] = array(
    'canonical'   => 'https://example.com/article',
    'headline'    => 'Article Title',
    'description' => 'Article description',
    'image'       => 'https://example.com/image.jpg',
);
```

### _og_video

Open Graph video URLs for embed detection:

```php
$data['_og_video'] = array(
    'https://www.youtube.com/embed/VIDEO_ID',
);
```

### _links.alternate_canonical

Alternate canonical URL from hreflang x-default:

```php
$data['_links']['alternate_canonical'] = 'https://example.com/en/article';
```

## Bookmarklet Changes

### Version Detection

The bookmarklet now sends a version number (`pt_version`) for upgrade detection:

```php
$version = $this->get_bookmarklet_version();
if ( $version < WP_Press_This_Plugin::VERSION ) {
    // Show upgrade prompt
}
```

### Enhanced Extraction

The bookmarklet extracts additional data:
- JSON-LD structured data (VideoObject, Article, WebPage, etc.)
- Open Graph video metadata (og:video, og:video:url, og:video:secure_url)
- Alternate canonical links (hreflang="x-default")

## JavaScript Integration

### Accessing the Editor

The block editor instance is available via:

```javascript
// Get current content
const content = window.pressThisEditor.getContent();

// Insert a block
const { createBlock } = wp.blocks;
const imageBlock = createBlock( 'core/image', { url: 'https://...' } );
window.pressThisEditor.insertBlock( imageBlock );
```

### Available Global Objects

```javascript
// Site/app configuration
window.wpPressThisConfig = {
    redirInParent: false,
};

// Scraped data
window.wpPressThisData = {
    u: 'https://source-url.com',
    v: 10,
    hasData: true,
    isLegacyBookmarklet: false,
    _images: [ ... ],
    _embeds: [ ... ],
};

// Editor settings
window.pressThisEditorSettings = {
    allowedBlocks: [ ... ],
    supportedPostFormats: [ ... ],
    suggestedPostFormat: 'video',
    canPublish: true,
    canUploadFiles: true,
};

// Localization strings
window.pressThisL10n = {
    newPost: 'Title',
    serverError: 'Connection lost...',
    // ...
};
```

## Requirements

Press This 2.0 requires:
- WordPress 6.0 or higher
- PHP 7.4 or higher

## Getting Help

- Report issues: https://github.com/WordPress/press-this/issues
- Contribute: https://github.com/WordPress/press-this
