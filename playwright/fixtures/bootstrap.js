// @ts-check

/**
 * Bootstrap spec for the OPS test session. POSTed to the CANONICAL
 * cross-app route /api/v1/_test/scenarios/context by the shared
 * lib/pkp/playwright/tests/bootstrap.setup.js (via `pkpApi.bootstrap`).
 *
 * Mirrors ojs-main/playwright/fixtures/bootstrap.js wherever the concept
 * exists in OPS. OPS is the app that REMOVES, so the deltas are large and
 * every one of them is forced by the app:
 *
 *   - `path` stays `publicknowledge` in all three apps (MULTIAPP-PLAN §3
 *     — POMs and `isBootstrapped()` rely on it).
 *   - ONE section, "Preprints" (APP-GLOSSARY §1 seed-data table). OPS
 *     sections are shaped exactly like OJS's, `abbrev` included.
 *   - no `issues` — OPS posts continuously; the key is an OJS-only schema
 *     overlay and would 400 here.
 *   - no review settings (`defaultReviewMode`, reminder windows,
 *     `reviewerSuggestionEnabled`): OPS has a single Production stage and
 *     no review machinery. `reviewerSuggestionEnabled` is not even in its
 *     context schema.
 *   - `users[]` is the SHARED identity roster FILTERED to the five user
 *     groups OPS installs (manager, sectionEditor, editorialBoardMember,
 *     author, reader). There is no editor, reviewer, copyeditor,
 *     layoutEditor, proofreader or funding group — assigning one fails
 *     loudly in UserGroupLookup, so the filter is a hard requirement, not
 *     a tidiness choice. See app.context.js `seed.actors` for how shared
 *     specs resolve "the senior editor" on an app with no editor group.
 */

const {
	baselineUsers,
	getPassword,
} = require('../../lib/pkp/playwright/data/users.js');

/**
 * Role strings backed by a user group in ops-main/registry/userGroups.xml.
 * Anything else in the shared roster is dropped rather than remapped —
 * silently re-homing (say) a reviewer onto the manager group would make
 * shared specs pass for the wrong reason.
 */
const OPS_ROLES = new Set([
	'manager',
	'sectionEditor',
	'editorialBoardMember',
	'author',
	'reader',
]);

const bootstrapUsers = baselineUsers
	.filter((u) => !u.siteAdmin)
	.map((u) => ({user: u, roles: (u.roles ?? []).filter((r) => OPS_ROLES.has(r))}))
	.filter(({roles}) => roles.length > 0)
	.map(({user, roles}) => ({
		username: user.username,
		password: getPassword(user.username),
		givenName: user.givenName,
		familyName: user.familyName,
		email: user.email,
		country: user.country,
		affiliation: user.affiliation,
		roles,
		...(user.mustChangePassword ? {mustChangePassword: true} : {}),
	}));

module.exports = {
	tag: 'baseline',
	path: 'publicknowledge',
	name: {
		en: 'Public Knowledge Preprint Server',
		fr_CA: 'Serveur de prépublications de la connaissance du public',
	},
	description: {
		en: 'The Public Knowledge Preprint Server hosts preprints on the subject of public access to science.',
		fr_CA:
			"Le serveur de prépublications de la connaissance du public héberge des prépublications sur l'accès du public à la science.",
	},
	acronym: {en: 'PKPS'},
	abbreviation: {en: 'PK Preprints'},
	primaryLocale: 'en',
	supportedLocales: ['en', 'fr_CA'],
	country: 'IS',
	contact: {name: 'Maya Manager', email: 'manager.maya@mailinator.com'},

	// Bootstrap enrichment — the OJS baseline's representative defaults,
	// restricted to settings OPS's context schema actually declares.
	enableAnnouncements: true,
	enablePublicComments: true,
	submitWithCategories: true,
	keywords: 'request',
	citations: 'request',
	enableDois: true,
	doiPrefix: '10.1234',
	enabledDoiTypes: ['publication'],
	doiCreationTime: 'publicationCreationTime',

	// One section — APP-GLOSSARY's seed-data row for OPS. Its editors are
	// the Moderator-slot accounts (OPS's sectionEditor group renders as
	// "Moderator" on screen).
	sections: [
		{
			abbrev: {en: 'PRE'},
			title: {en: 'Preprints'},
			sectionEditors: [
				'sectioneditor.ana',
				'sectioneditor.ravi',
				'sectioneditor.omar',
			],
		},
	],

	categories: [
		{
			path: 'applied-science',
			title: {en: 'Applied Science'},
			children: [
				{
					path: 'comp-sci',
					title: {en: 'Computer Science'},
					children: [{path: 'computer-vision', title: {en: 'Computer Vision'}}],
				},
				{path: 'eng', title: {en: 'Engineering'}},
			],
		},
		{
			path: 'social-sciences',
			title: {en: 'Social Sciences'},
			children: [
				{path: 'sociology', title: {en: 'Sociology'}},
				{path: 'anthropology', title: {en: 'Anthropology'}},
			],
		},
	],

	users: bootstrapUsers,
};
