# Press This Test Suite

This directory contains tests for the Press This plugin.

## Directory Structure

```
tests/
├── fixtures/           # Mock HTML files for URL scraping tests
│   ├── open-graph.html      # Page with Open Graph metadata
│   ├── twitter-cards.html   # Page with Twitter Card metadata
│   ├── json-ld.html         # Page with JSON-LD structured data
│   ├── minimal.html         # Minimal page without special metadata
│   └── video-embed.html     # Page with embedded videos
├── php/                # PHP unit tests
└── components/         # JavaScript component tests
```

## Running Tests

### PHP Tests

```bash
# Run all PHP tests
npm run test:php

# Run specific test file
npm run test:php -- --filter=test-endpoint-frontend
```

### JavaScript Tests

```bash
# Run JavaScript tests
npm run test:js
```

## Test Environment Limitations

### Docker Network Isolation

When running tests in the `wp-env` Docker environment, the WordPress container cannot fetch external URLs due to network isolation. This affects:

- URL scraping endpoint tests
- Integration tests that require fetching remote content

### Workarounds

#### 1. HTTP Request Mocking (Recommended)

Use the WordPress `pre_http_request` filter to mock HTTP responses in PHP tests:

```php
add_filter( 'pre_http_request', function( $preempt, $args, $url ) {
    // Load fixture content based on URL
    if ( str_contains( $url, 'example.com/open-graph' ) ) {
        $html = file_get_contents( __DIR__ . '/fixtures/open-graph.html' );
        return array(
            'response' => array( 'code' => 200 ),
            'body'     => $html,
        );
    }
    return $preempt;
}, 10, 3 );
```

#### 2. Local Test Fixtures

Test fixtures in `tests/fixtures/` can be served locally:

```php
// Example: Mock response using local fixture
$fixture_path = __DIR__ . '/fixtures/open-graph.html';
$html_content = file_get_contents( $fixture_path );
```

#### 3. Test-Only URL Bypass

The URL validation can be bypassed for testing by adding a filter:

```php
// Only use in test environment!
add_filter( 'press_this_validate_url', function( $is_valid, $url ) {
    if ( defined( 'WP_TESTS_DOMAIN' ) ) {
        return true; // Allow all URLs in test environment
    }
    return $is_valid;
}, 10, 2 );
```

**Important:** Never disable URL validation in production.

## Test Fixtures

### open-graph.html
Contains standard Open Graph metadata:
- `og:title`, `og:description`, `og:image`
- Multiple content images in body

### twitter-cards.html
Contains Twitter Card metadata:
- `twitter:card`, `twitter:title`, `twitter:description`
- `twitter:image`, `twitter:site`, `twitter:creator`

### json-ld.html
Contains JSON-LD structured data:
- Article schema with headline, description, image
- Author and publisher information

### minimal.html
Minimal HTML page without special metadata for testing fallback behavior.

### video-embed.html
Contains embedded videos:
- YouTube iframe embed
- Vimeo iframe embed
- Open Graph video metadata

## Writing Tests

### Testing URL Scraping

```php
public function test_scrape_extracts_open_graph() {
    // Mock the HTTP request
    add_filter( 'pre_http_request', array( $this, 'mock_og_response' ), 10, 3 );

    // Call the scrape method
    $result = $this->scraper->scrape( 'https://example.com/test' );

    // Assert Open Graph data was extracted
    $this->assertEquals( 'Open Graph Test Title', $result['title'] );

    // Clean up
    remove_filter( 'pre_http_request', array( $this, 'mock_og_response' ) );
}

public function mock_og_response( $preempt, $args, $url ) {
    return array(
        'response' => array( 'code' => 200 ),
        'body'     => file_get_contents( __DIR__ . '/fixtures/open-graph.html' ),
    );
}
```

### Testing Featured Image

```php
public function test_featured_image_set_correctly() {
    // Create a test attachment
    $attachment_id = $this->factory->attachment->create_upload_object(
        DIR_TESTDATA . '/images/test-image.jpg'
    );

    // Create a post with featured image
    $post_id = $this->factory->post->create();

    // Save via Press This endpoint
    $request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
    $request->set_param( 'post_id', $post_id );
    $request->set_param( 'featured_image', $attachment_id );

    $response = rest_do_request( $request );

    // Verify featured image was set
    $this->assertEquals( $attachment_id, get_post_thumbnail_id( $post_id ) );
}
```

## Coverage

To generate test coverage reports:

```bash
# PHP coverage (requires Xdebug)
npm run test:php -- --coverage-html=coverage/php

# JavaScript coverage
npm run test:js -- --coverage
```
