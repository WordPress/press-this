<?php
/**
 * Press This Assets
 *
 * Handles registration and enqueueing of Gutenberg block editor assets.
 *
 * @package Press_This_Plugin
 * @since 2.0.1
 */

/**
 * Press This Assets class.
 *
 * @since 2.0.1
 */
class Press_This_Assets {

	/**
	 * Plugin directory path.
	 *
	 * @var string
	 */
	private $plugin_dir;

	/**
	 * Plugin directory URL.
	 *
	 * @var string
	 */
	private $plugin_url;

	/**
	 * Constructor.
	 *
	 * @param string $plugin_file Main plugin file path.
	 */
	public function __construct( $plugin_file ) {
		$this->plugin_dir = plugin_dir_path( $plugin_file );
		$this->plugin_url = plugin_dir_url( $plugin_file );
	}

	/**
	 * Register block editor scripts and styles.
	 *
	 * @since 2.0.1
	 */
	public function register_assets() {
		$asset_file = $this->plugin_dir . 'build/press-this-editor.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		// Filter dependencies - remove CSS file paths and keep only valid WP script handles.
		$dependencies = array_filter(
			$asset['dependencies'],
			function ( $dep ) {
				// Skip CSS file paths that webpack incorrectly adds as dependencies.
				return strpos( $dep, '.css' ) === false;
			}
		);
		$dependencies = array_values( $dependencies );

		// Ensure wp-primitives is loaded (needed by @wordpress/components for icons).
		if ( ! in_array( 'wp-primitives', $dependencies, true ) ) {
			$dependencies[] = 'wp-primitives';
		}

		// Register the main editor script.
		wp_register_script(
			'press-this-editor',
			$this->plugin_url . 'build/press-this-editor.js',
			$dependencies,
			$asset['version'],
			true
		);

		// Register the editor styles.
		wp_register_style(
			'press-this-editor',
			$this->plugin_url . 'build/press-this-editor.css',
			array( 'wp-components', 'wp-block-editor', 'wp-edit-blocks' ),
			$asset['version']
		);

		// Register the legacy styles for backward compatibility.
		if ( is_rtl() ) {
			wp_register_style(
				'press-this-legacy',
				$this->plugin_url . 'assets/press-this-rtl.css',
				array( 'buttons' ),
				PRESS_THIS__VERSION
			);
		} else {
			wp_register_style(
				'press-this-legacy',
				$this->plugin_url . 'assets/press-this.css',
				array( 'buttons' ),
				PRESS_THIS__VERSION
			);
		}
	}

	/**
	 * Enqueue block editor scripts and styles.
	 *
	 * @since 2.0.1
	 *
	 * @param array $data Data to localize for the editor.
	 */
	public function enqueue_editor_assets( $data = array() ) {
		// Enqueue the WordPress media library for Featured Image.
		if ( current_user_can( 'upload_files' ) ) {
			wp_enqueue_media();
		}

		// Enqueue the editor script.
		wp_enqueue_script( 'press-this-editor' );

		// Enqueue the editor styles.
		wp_enqueue_style( 'press-this-editor' );
		wp_enqueue_style( 'press-this-legacy' );

		// Localize script data.
		$this->localize_editor_data( $data );
	}

	/**
	 * Localize editor data for JavaScript.
	 *
	 * @since 2.0.1
	 *
	 * @param array $data Data to pass to the editor.
	 */
	public function localize_editor_data( $data = array() ) {
		$default_data = array(
			'content' => '',
			'title'   => '',
			'images'  => array(),
			'embeds'  => array(),
			'url'     => '',
			'domain'  => '',
		);

		$localized_data = wp_parse_args( $data, $default_data );

		wp_localize_script(
			'press-this-editor',
			'wpPressThisData',
			$localized_data
		);

		// Editor settings.
		$settings = $this->get_editor_settings();

		wp_localize_script(
			'press-this-editor',
			'pressThisEditorSettings',
			$settings
		);
	}

	/**
	 * Get editor settings.
	 *
	 * @since 2.0.1
	 *
	 * @return array Editor settings.
	 */
	public function get_editor_settings() {
		$default_blocks = array(
			'core/paragraph',
			'core/heading',
			'core/image',
			'core/quote',
			'core/list',
			'core/list-item',
			'core/embed',
		);

		/**
		 * Filters the allowed blocks in Press This.
		 *
		 * @since 2.0.1
		 *
		 * @param string[] $allowed_blocks Array of allowed block type names.
		 */
		$allowed_blocks = apply_filters( 'press_this_allowed_blocks', $default_blocks );

		return array(
			'allowedBlocks'   => $allowed_blocks,
			'hasFixedToolbar' => true,
			'isRTL'           => is_rtl(),
			'siteUrl'         => home_url(),
			'ajaxUrl'         => admin_url( 'admin-ajax.php' ),
			'scriptDebug'     => defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG,
		);
	}

	/**
	 * Get the script dependencies for the editor.
	 *
	 * @since 2.0.1
	 *
	 * @return array Array of script handles.
	 */
	public function get_script_dependencies() {
		$asset_file = $this->plugin_dir . 'build/press-this-editor.asset.php';

		if ( file_exists( $asset_file ) ) {
			$asset = require $asset_file;
			return $asset['dependencies'];
		}

		// Fallback dependencies if asset file doesn't exist.
		return array(
			'wp-block-editor',
			'wp-blocks',
			'wp-components',
			'wp-compose',
			'wp-data',
			'wp-element',
			'wp-i18n',
			'wp-rich-text',
		);
	}
}
