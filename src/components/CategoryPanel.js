/**
 * Category Panel Component
 *
 * Hierarchical category selector with search filtering,
 * using native Gutenberg component primitives.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useMemo, useState, useCallback } from '@wordpress/element';
import {
	PanelBody,
	SearchControl,
	CheckboxControl,
	TreeSelect,
	TextControl,
	Button,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { useDebounce } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import {
	buildTermsTree,
	getFilterMatcher,
	unescapeString,
} from '../utils/terms';

const MIN_TERMS_COUNT_FOR_FILTER = 8;

/**
 * Category Panel component.
 *
 * @param {Object}   props                    Component props.
 * @param {Array}    props.categories         Flat array of { id, name, parent, slug }.
 * @param {Array}    props.selectedCategories Array of selected category IDs.
 * @param {Function} props.onSelectionChange  Callback with updated selected IDs.
 * @param {Function} props.onCategoriesChange Callback with updated categories list.
 * @param {boolean}  props.canEditCategories  Whether user can create categories.
 * @param {string}   props.categoryNonce      Nonce for add-category AJAX.
 * @param {string}   props.ajaxUrl            WordPress admin-ajax.php URL.
 * @return {JSX.Element} Category panel.
 */
export default function CategoryPanel( {
	categories,
	selectedCategories,
	onSelectionChange,
	onCategoriesChange,
	canEditCategories = false,
	categoryNonce = '',
	ajaxUrl = '',
} ) {
	// Search/filter state.
	const [ filterValue, setFilterValue ] = useState( '' );

	// Add New Category form state.
	const [ isAddCategoryOpen, setIsAddCategoryOpen ] = useState( false );
	const [ newCategoryName, setNewCategoryName ] = useState( '' );
	const [ newCategoryParent, setNewCategoryParent ] = useState( 0 );
	const [ isCreatingCategory, setIsCreatingCategory ] = useState( false );
	const [ categoryError, setCategoryError ] = useState( '' );

	// Build the hierarchical tree from the flat categories.
	const termsTree = useMemo(
		() => buildTermsTree( categories ),
		[ categories ]
	);

	// Debounced screen reader announcement.
	const debouncedSpeak = useDebounce( speak, 500 );

	/**
	 * Count total terms in a tree (recursive).
	 *
	 * @param {Array} tree Terms tree.
	 * @return {number} Total count.
	 */
	const countTerms = useCallback( ( tree ) => {
		let count = 0;
		for ( const term of tree ) {
			count += 1;
			if ( term.children?.length ) {
				count += countTerms( term.children );
			}
		}
		return count;
	}, [] );

	// Derive filtered tree from termsTree + filterValue so it stays
	// in sync when categories change while a filter is active.
	const filteredTermsTree = useMemo( () => {
		if ( filterValue === '' ) {
			return [];
		}
		return termsTree
			.map( getFilterMatcher( filterValue ) )
			.filter( ( term ) => term );
	}, [ termsTree, filterValue ] );

	/**
	 * Handle filter value changes.
	 * Updates the filter and announces results to screen readers.
	 */
	const setFilter = useCallback(
		( value ) => {
			setFilterValue( value );

			if ( value === '' ) {
				return;
			}

			const filtered = termsTree
				.map( getFilterMatcher( value ) )
				.filter( ( term ) => term );
			const resultCount = countTerms( filtered );
			const message = sprintf(
				/* translators: %d: number of results */
				_n(
					'%d result found.',
					'%d results found.',
					resultCount,
					'press-this'
				),
				resultCount
			);
			debouncedSpeak( message, 'assertive' );
		},
		[ termsTree, countTerms, debouncedSpeak ]
	);

	/**
	 * Toggle a category selection.
	 *
	 * @param {number} termId Category ID to toggle.
	 */
	const handleCategoryToggle = useCallback(
		( termId ) => {
			if ( selectedCategories.includes( termId ) ) {
				onSelectionChange(
					selectedCategories.filter( ( id ) => id !== termId )
				);
			} else {
				onSelectionChange( [ ...selectedCategories, termId ] );
			}
		},
		[ selectedCategories, onSelectionChange ]
	);

	/**
	 * Handle creating a new category via AJAX.
	 */
	const handleAddCategory = useCallback( async () => {
		if ( ! newCategoryName.trim() || ! categoryNonce || ! ajaxUrl ) {
			return;
		}

		setIsCreatingCategory( true );
		setCategoryError( '' );

		try {
			const params = new URLSearchParams();
			params.append( 'action', 'press-this-plugin-add-category' );
			params.append( 'new_cat_nonce', categoryNonce );
			params.append( 'name', newCategoryName.trim() );
			params.append( 'parent', newCategoryParent.toString() );

			const response = await fetch( ajaxUrl, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString(),
			} );

			const result = await response.json();

			if ( result.success && result.data && result.data.length > 0 ) {
				const newCats = result.data.map( ( cat ) => ( {
					id: cat.term_id,
					name: cat.name,
					parent: cat.parent,
				} ) );

				onCategoriesChange( ( prev ) => [ ...prev, ...newCats ] );

				// Auto-select the newly created categories.
				const newCatIds = newCats.map( ( cat ) => cat.id );
				onSelectionChange( ( prev ) => [ ...prev, ...newCatIds ] );

				// Clear form and close.
				setNewCategoryName( '' );
				setNewCategoryParent( 0 );
				setIsAddCategoryOpen( false );
			} else {
				setCategoryError(
					result.data?.errorMessage ||
						__( 'Failed to create category.', 'press-this' )
				);
			}
		} catch ( error ) {
			setCategoryError(
				__( 'Failed to create category.', 'press-this' )
			);
		} finally {
			setIsCreatingCategory( false );
		}
	}, [
		newCategoryName,
		newCategoryParent,
		categoryNonce,
		ajaxUrl,
		onCategoriesChange,
		onSelectionChange,
	] );

	/**
	 * Render a list of terms as hierarchical checkboxes.
	 *
	 * @param {Array} terms Terms tree nodes.
	 * @return {JSX.Element[]} Rendered term checkboxes.
	 */
	const renderTerms = ( terms ) => {
		return terms.map( ( term ) => (
			<div
				key={ term.id }
				className="press-this-editor__hierarchical-terms-choice"
			>
				<CheckboxControl
					__nextHasNoMarginBottom
					checked={ selectedCategories.includes( term.id ) }
					onChange={ () => handleCategoryToggle( term.id ) }
					label={ unescapeString( term.name ) }
				/>
				{ !! term.children.length && (
					<div className="press-this-editor__hierarchical-terms-subchoices">
						{ renderTerms( term.children ) }
					</div>
				) }
			</div>
		) );
	};

	// Determine which tree to display.
	const displayedTerms = filterValue !== '' ? filteredTermsTree : termsTree;
	const showFilter = categories.length >= MIN_TERMS_COUNT_FOR_FILTER;

	return (
		<PanelBody
			title={ __( 'Categories', 'press-this' ) }
			initialOpen={ false }
		>
			{ showFilter && (
				<SearchControl
					__nextHasNoMarginBottom
					label={ __( 'Search Categories', 'press-this' ) }
					placeholder={ __( 'Search Categories', 'press-this' ) }
					value={ filterValue }
					onChange={ setFilter }
					className="press-this-editor__categories-search"
				/>
			) }

			<div
				className="press-this-editor__hierarchical-terms-list"
				tabIndex={ 0 }
				role="group"
				aria-label={ __( 'Categories', 'press-this' ) }
			>
				{ displayedTerms.length > 0 ? (
					renderTerms( displayedTerms )
				) : (
					<p className="press-this-editor__categories-no-results">
						{ __( 'No categories found.', 'press-this' ) }
					</p>
				) }
			</div>

			{ /* Add New Category */ }
			{ canEditCategories && categoryNonce && (
				<div className="press-this-editor__add-category">
					<Button
						variant="link"
						onClick={ () =>
							setIsAddCategoryOpen( ! isAddCategoryOpen )
						}
						className="press-this-editor__add-category-toggle"
					>
						{ isAddCategoryOpen
							? __( '— Close —', 'press-this' )
							: __( '+ Add New Category', 'press-this' ) }
					</Button>

					{ isAddCategoryOpen && (
						<div className="press-this-editor__add-category-form">
							<TextControl
								value={ newCategoryName }
								onChange={ setNewCategoryName }
								placeholder={ __(
									'New Category Name',
									'press-this'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TreeSelect
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								noOptionLabel={ __(
									'\u2014 Parent Category \u2014',
									'press-this'
								) }
								onChange={ ( parentId ) =>
									setNewCategoryParent(
										parentId ? parseInt( parentId, 10 ) : 0
									)
								}
								selectedId={
									newCategoryParent
										? String( newCategoryParent )
										: ''
								}
								tree={ termsTree }
							/>
							{ categoryError && (
								<p className="press-this-editor__add-category-error">
									{ categoryError }
								</p>
							) }
							<Button
								variant="secondary"
								onClick={ handleAddCategory }
								disabled={
									! newCategoryName.trim() ||
									isCreatingCategory
								}
								isBusy={ isCreatingCategory }
								className="press-this-editor__add-category-button"
							>
								{ __( 'Add New Category', 'press-this' ) }
							</Button>
						</div>
					) }
				</div>
			) }
		</PanelBody>
	);
}
