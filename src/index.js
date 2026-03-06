/**
 * Press This - Gutenberg Block Editor Application
 *
 * Main entry point for the fully React-based Press This editor.
 * All UI is rendered by React using @wordpress/components.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import '@wordpress/format-library';
import { createRoot, StrictMode } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';

/**
 * Internal dependencies
 */
import App from './App';
import './styles/main.scss';

/**
 * Initialize the Press This application when the DOM is ready.
 */
domReady( () => {
	const container = document.getElementById( 'press-this-app' );

	if ( container ) {
		const root = createRoot( container );
		root.render(
			<StrictMode>
				<App />
			</StrictMode>
		);
	}
} );
