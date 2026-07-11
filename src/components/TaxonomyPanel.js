/**
 * Taxonomy Panel Component
 *
 * Renders a panel for a single custom taxonomy: a hierarchical checkbox
 * tree (mirroring CategoryPanel) for hierarchical taxonomies, or a
 * FormTokenField for flat taxonomies.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useCallback, useMemo, useRef, useState } from '@wordpress/element';
import {
	CheckboxControl,
	FormTokenField,
	PanelBody,
	SearchControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	buildTermsTree,
	getFilterMatcher,
	unescapeString,
} from '../utils/terms';
import { getWpRestBaseUrl } from '../utils/rest';

const MIN_TERMS_COUNT_FOR_FILTER = 8;

/**
 * Render a list of terms as hierarchical checkboxes.
 *
 * @param {Array}    terms           Terms tree nodes.
 * @param {Array}    selectedTermIds Selected term IDs.
 * @param {Function} onToggle        Called with a term ID to toggle.
 * @return {JSX.Element[]} Rendered term checkboxes.
 */
function renderTerms( terms, selectedTermIds, onToggle ) {
	return terms.map( ( term ) => (
		<div
			key={ term.id }
			className="press-this-editor__hierarchical-terms-choice"
		>
			<CheckboxControl
				__nextHasNoMarginBottom
				checked={ selectedTermIds.includes( term.id ) }
				onChange={ () => onToggle( term.id ) }
				label={ unescapeString( term.name ) }
			/>
			{ !! term.children.length && (
				<div className="press-this-editor__hierarchical-terms-subchoices">
					{ renderTerms( term.children, selectedTermIds, onToggle ) }
				</div>
			) }
		</div>
	) );
}

/**
 * Hierarchical taxonomy panel: checkbox tree, same interaction as CategoryPanel.
 *
 * @param {Object}   props                   Component props.
 * @param {Object}   props.taxonomy          Taxonomy data { name, label, terms }.
 * @param {Array}    props.selectedTermIds   Selected term IDs.
 * @param {Function} props.onSelectionChange State updater for selected IDs.
 * @return {JSX.Element} Hierarchical taxonomy panel.
 */
function HierarchicalTaxonomyPanel( {
	taxonomy,
	selectedTermIds,
	onSelectionChange,
} ) {
	const [ filterValue, setFilterValue ] = useState( '' );

	const termsTree = useMemo(
		() => buildTermsTree( taxonomy.terms ),
		[ taxonomy.terms ]
	);

	const filteredTermsTree = useMemo( () => {
		if ( filterValue === '' ) {
			return [];
		}
		return termsTree
			.map( getFilterMatcher( filterValue ) )
			.filter( ( term ) => term );
	}, [ termsTree, filterValue ] );

	const handleToggle = useCallback(
		( termId ) => {
			onSelectionChange( ( prev ) => {
				if ( prev.includes( termId ) ) {
					return prev.filter( ( id ) => id !== termId );
				}
				return [ ...prev, termId ];
			} );
		},
		[ onSelectionChange ]
	);

	const displayedTerms = filterValue !== '' ? filteredTermsTree : termsTree;
	const showFilter = taxonomy.terms.length >= MIN_TERMS_COUNT_FOR_FILTER;

	return (
		<PanelBody title={ taxonomy.label } initialOpen={ false }>
			{ showFilter && (
				<SearchControl
					__nextHasNoMarginBottom
					label={ taxonomy.label }
					placeholder={ taxonomy.label }
					value={ filterValue }
					onChange={ setFilterValue }
					className="press-this-editor__categories-search"
				/>
			) }

			<div
				className="press-this-editor__hierarchical-terms-list"
				tabIndex={ 0 }
				role="group"
				aria-label={ taxonomy.label }
			>
				{ displayedTerms.length > 0 ? (
					renderTerms( displayedTerms, selectedTermIds, handleToggle )
				) : (
					<p className="press-this-editor__categories-no-results">
						{ __( 'No terms found.', 'press-this' ) }
					</p>
				) }
			</div>
		</PanelBody>
	);
}

/**
 * Flat taxonomy panel: token field, same interaction as the Tags panel.
 *
 * @param {Object}   props                   Component props.
 * @param {Object}   props.taxonomy          Taxonomy data { name, label, restBase }.
 * @param {Array}    props.selectedTermNames Selected term names.
 * @param {Function} props.onSelectionChange State updater for selected names.
 * @param {string}   props.restUrl           Press This REST URL, used to derive the core REST base.
 * @param {string}   props.restNonce         REST nonce.
 * @return {JSX.Element} Flat taxonomy panel.
 */
function FlatTaxonomyPanel( {
	taxonomy,
	selectedTermNames,
	onSelectionChange,
	restUrl,
	restNonce,
} ) {
	const [ suggestions, setSuggestions ] = useState( [] );
	const searchTimeout = useRef( null );

	const searchTerms = useCallback(
		( search ) => {
			if ( searchTimeout.current ) {
				clearTimeout( searchTimeout.current );
			}

			if ( ! search || search.length < 2 || ! taxonomy.restBase ) {
				setSuggestions( [] );
				return;
			}

			searchTimeout.current = setTimeout( async () => {
				try {
					const wpRestBase = getWpRestBaseUrl( restUrl );
					const taxUrl = wpRestBase.includes( 'rest_route=' )
						? `${ wpRestBase }wp/v2/${
								taxonomy.restBase
						  }&search=${ encodeURIComponent(
								search
						  ) }&per_page=10`
						: `${ wpRestBase }wp/v2/${
								taxonomy.restBase
						  }?search=${ encodeURIComponent(
								search
						  ) }&per_page=10`;

					const response = await fetch( taxUrl, {
						headers: { 'X-WP-Nonce': restNonce },
					} );

					if ( response.ok ) {
						const results = await response.json();
						setSuggestions( results.map( ( term ) => term.name ) );
					}
				} catch ( error ) {
					setSuggestions( [] );
				}
			}, 300 );
		},
		[ restUrl, restNonce, taxonomy.restBase ]
	);

	return (
		<PanelBody title={ taxonomy.label } initialOpen={ false }>
			<FormTokenField
				label={ taxonomy.label }
				value={ selectedTermNames }
				suggestions={ suggestions }
				onChange={ onSelectionChange }
				onInputChange={ searchTerms }
				placeholder={ taxonomy.label }
				__experimentalExpandOnFocus
				__experimentalShowHowTo={ false }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}

/**
 * Taxonomy Panel component - dispatches to hierarchical or flat rendering.
 *
 * @param {Object}   props                   Component props.
 * @param {Object}   props.taxonomy          Taxonomy data from press_this_taxonomies.
 * @param {Array}    props.selectedTerms     Selected term IDs (hierarchical) or names (flat).
 * @param {Function} props.onSelectionChange State updater for the selection.
 * @param {string}   props.restUrl           Press This REST URL.
 * @param {string}   props.restNonce         REST nonce.
 * @return {JSX.Element} Taxonomy panel.
 */
export default function TaxonomyPanel( {
	taxonomy,
	selectedTerms,
	onSelectionChange,
	restUrl,
	restNonce,
} ) {
	if ( taxonomy.hierarchical ) {
		return (
			<HierarchicalTaxonomyPanel
				taxonomy={ taxonomy }
				selectedTermIds={ selectedTerms }
				onSelectionChange={ onSelectionChange }
			/>
		);
	}

	return (
		<FlatTaxonomyPanel
			taxonomy={ taxonomy }
			selectedTermNames={ selectedTerms }
			onSelectionChange={ onSelectionChange }
			restUrl={ restUrl }
			restNonce={ restNonce }
		/>
	);
}
