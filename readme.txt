=== Press This ===
Contributors: kraftbj, wordpressdotorg
Donate link: http://wordpressfoundation.org/donate/
Tags: post, quick-post, photo-post, bookmarklet, gutenberg
Requires at least: 6.9
Tested up to: 6.7
Stable tag: 2.0.1
Requires PHP: 7.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Posting images, links, and cat gifs will never be the same.

== Description ==

Press This is a little tool that lets you grab bits of the web and create new posts with ease.
It will even allow you to choose from images or videos included on the page and use them in your post.
Use Press This as a quick and lightweight way to highlight another page on the web.

= Version 2.0 - Gutenberg Block Editor =

Press This 2.0 brings the modern WordPress block editor experience to the bookmarklet popup. You can now compose posts using familiar blocks like Paragraph, Heading, Image, Quote, List, and Embed.

**New Features:**

* **Gutenberg Block Editor** - Full block editor integration for a consistent WordPress editing experience
* **Smart Post Format Suggestions** - Automatically suggests Video, Quote, or Link formats based on content
* **Enhanced Content Extraction** - Improved scraping with JSON-LD structured data support
* **Client-Side Only Scraping** - All content extraction happens in your browser for better privacy and security
* **Featured Image Support** - Set any scraped image as your post's featured image
* **Improved Media Grid** - Better thumbnail display with support for video and audio embeds

= Filters for Developers =

Press This 2.0 includes new filters for customization:

* `press_this_allowed_blocks` - Customize which blocks are available in the editor
* `press_this_post_format_suggestion` - Modify the auto-suggested post format

See the [Developer Documentation](#developer-documentation) section below for details.

== Contributing ==

Bugs and PRs can be submitted via https://github.com/WordPress/press-this .

== Installation ==

1. Install the plugin via your wp-admin dashboard via Plugins->Add New as normal.
2. Visit the Tools page of wp-admin for additional installation steps.

== Frequently Asked Questions ==

= Is Press This compatible with my existing bookmarklet? =

Yes! Existing bookmarklets from version 1.x will continue to work. However, we recommend updating your bookmarklet to get the enhanced features of version 2.0. An upgrade prompt will appear when using an older bookmarklet.

= Which blocks are available in Press This? =

By default, Press This includes: Paragraph, Heading, Image, Quote, List, and Embed blocks. Developers can customize this using the `press_this_allowed_blocks` filter.

= Can I still use the full WordPress editor? =

Absolutely! Click the "Standard Editor" option in the publish dropdown to save your draft and continue editing in the full WordPress block editor.

== Developer Documentation ==

= New Hooks and Filters in 2.0 =

**press_this_allowed_blocks**

Customize which blocks are available in the Press This editor.

`
add_filter( 'press_this_allowed_blocks', function( $blocks ) {
    // Add the gallery block
    $blocks[] = 'core/gallery';

    // Remove the embed block
    $blocks = array_filter( $blocks, function( $block ) {
        return $block !== 'core/embed';
    } );

    return $blocks;
} );
`

Default blocks: `core/paragraph`, `core/heading`, `core/image`, `core/quote`, `core/list`, `core/list-item`, `core/embed`

**press_this_post_format_suggestion**

Modify or override the auto-suggested post format based on content.

`
add_filter( 'press_this_post_format_suggestion', function( $suggested_format, $data ) {
    // If the URL contains 'podcast', suggest audio format
    if ( ! empty( $data['u'] ) && strpos( $data['u'], 'podcast' ) !== false ) {
        return 'audio';
    }

    return $suggested_format;
}, 10, 2 );
`

The `$data` array contains scraped content including:
- `u` - Source URL
- `s` - Selected text
- `t` - Page title
- `_images` - Array of image URLs
- `_embeds` - Array of embed URLs
- `_meta` - Meta tag data
- `_jsonld` - JSON-LD structured data

= Preserved Hooks from 1.x =

All existing hooks continue to work:

* `press_this_redirect_in_parent` - Control post-save redirect behavior
* `press_this_save_post` - Filter post data before saving
* `press_this_save_redirect` - Filter redirect URL after save
* `enable_press_this_media_discovery` - Toggle media scraping
* `press_this_data` - Filter the complete scraped data array
* `press_this_suggested_html` - Filter default content templates
* `shortcut_link` - Customize the bookmarklet URL

== Upgrade Notice ==

= 2.0.1 =
Major update: Gutenberg block editor integration, enhanced content extraction, new developer hooks. Backward compatible with existing bookmarklets.

= 1.1.2 =
Fixes styling issues and bumps tested version.

= 1.1.1 =
Restores bookmarklet functionality.

== Changelog ==

= 2.0.1 =
* **New:** Gutenberg block editor replaces TinyMCE for modern editing experience
* **New:** Smart post format auto-suggestion based on content type
* **New:** `press_this_allowed_blocks` filter for customizing available blocks
* **New:** `press_this_post_format_suggestion` filter for customizing format suggestions
* **New:** JSON-LD structured data extraction for better content discovery
* **New:** Open Graph video metadata extraction for improved embed detection
* **New:** Featured image selection from scraped images
* **New:** Alternate canonical URL detection via hreflang
* **Improved:** Client-side only content extraction (removed server-side scraping)
* **Improved:** Media grid with video/audio type indicators
* **Improved:** Bookmarklet version detection with upgrade prompts
* **Improved:** Title extraction now checks JSON-LD headline
* **Improved:** Description extraction now checks JSON-LD description
* **Compatibility:** All 1.x hooks and filters preserved
* **Compatibility:** Legacy bookmarklet URL format continues to work
* **Requires:** WordPress 6.9 or higher
* **Requires:** PHP 7.4 or higher

= 1.1.2 =
* Fixes the styling of the .press-this .modal-close class (props https://github.com/crishnakh)
* Bumps the Tested up to version to 6.7.1

= 1.1.1 =
* Corrects an issue with the packaging of the plugin for SVN.

= 1.1.0 =
* Restores the bookmarklet functionality previously found in WordPress 4.8 and prior verions.

= 1.0 =
* Initial release as a plugin. Previously part of WordPress itself.

== History ==

WordPress, from the earliest days, included some way to bring in snippets from other websites for you to post on your own.

The original "Press It" was removed from WordPress 2.5 and a new "Press This" added in 2.6. It existed pretty much unchanged until WordPress 4.2, which completely refreshed Press This.

In WordPress 4.9, Press This was spun out to a "canonical plugin" -- an official plugin from WordPress.org so sites who wanted to use it could, but streamline more niche functionality out of Core. This was previously done with the Importers.

In version 2.0, Press This was modernized to use the Gutenberg block editor, bringing it in line with the modern WordPress editing experience while maintaining backward compatibility with existing installations.
