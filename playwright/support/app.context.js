// @ts-check

/**
 * OPS app context — the capability map shared specs gate on.
 *
 * Contract (MULTIAPP-PLAN §3, APP-GLOSSARY §2–§3):
 *   - Shared specs in lib/pkp/playwright/tests/ gate on CAPABILITIES, never
 *     app names: `test.skip(!appContext.hasReviewStage, …)`, never
 *     `if (app === 'ops')`.
 *   - The `hasX` names below are CANONICAL — copied verbatim from
 *     ojs-main/docs/product/APP-GLOSSARY.md §2. Adding a capability means
 *     adding a row there first, then the same key in all three
 *     app.context.js files.
 *   - Vocabulary and seed nouns never gate anything; they come from
 *     `vocab` / `seed` so one shared test renders the right labels
 *     wherever the capability holds.
 *
 * OPS is the app that REMOVES: one workflow stage, no review, no
 * copyediting, five user groups. Beware skip-hollowing (MULTIAPP-PLAN
 * §7.5) — a shared suite that skips most of itself here reads as coverage
 * but isn't; OPS is tracked by its own applicable-feature list.
 *
 * Consumed through the shared `appContext` fixture
 * (lib/pkp/playwright/support/base-test.js), which resolves this file from
 * `process.cwd()` and cross-checks `app` against the Playwright project
 * name.
 */

module.exports = {
	app: 'ops',

	// ---- Capabilities (canonical names — APP-GLOSSARY.md §2) ----------

	/** No review stage at all — the whole review cluster is absent. */
	hasReviewStage: false,
	/** OMP-unique Internal Review stage. */
	hasInternalReview: false,
	/** No copyediting stage. */
	hasCopyediting: false,
	/** Production — OPS's ONLY stage. */
	hasProduction: true,
	/** No issues; preprints post continuously. */
	hasIssues: false,
	/** Galleys, unchanged from OJS. */
	hasGalleys: true,
	/** No subscriptions (no payments code at all). */
	hasSubscriptions: false,
	/** Sections, unchanged from OJS (one seeded section, "Preprints"). */
	hasSections: true,
	/** No reviewer user group exists — reviewer personas cannot be seeded. */
	hasReviewerRoles: false,

	// ---- Workflow topology --------------------------------------------

	/**
	 * WORKFLOW_STAGE_ID_* values this app actually instantiates.
	 * `Application::getApplicationStages()` returns [5] — Production is
	 * both the first and only stage, and OPS's submissions table defaults
	 * the stage_id column to 5. A seeded OPS submission parked on stage 1
	 * is invisible to the dashboard collector (the G3 landmine).
	 */
	stages: [5],
	/** Stage a freshly-seeded submission lands on — Production, not Submission. */
	initialStageId: 5,
	/** No review stage. */
	reviewStageId: null,
	/** No internal review stage. */
	internalReviewStageId: null,

	// ---- Scenario-spec vocabulary --------------------------------------

	/**
	 * Key the submission scenario spec uses for its content container.
	 * REQUIRED on OPS — its publication schema lists `sectionId` in its
	 * own required block.
	 */
	submissionContainerKey: 'section',

	// ---- Reader-facing vocabulary (APP-GLOSSARY §1) ---------------------

	vocab: {
		context: 'preprint server',
		contextPlural: 'preprint servers',
		submission: 'preprint',
		container: 'section',
		representation: 'galley',
		managerRole: 'Preprint Server Manager',
		// APP-GLOSSARY §1 records the Moderator↔Section-editor mapping with
		// a "confirm against the OPS masthead on first probe" caveat.
		subEditorRole: 'Moderator',
	},

	// ---- Baseline seed (playwright/fixtures/bootstrap.js) ---------------

	seed: {
		/** Same URL path in all three apps — POMs can hard-default it. */
		contextPath: 'publicknowledge',
		contextName: 'Public Knowledge Preprint Server',
		/** Handles of the seeded containers, in bootstrap order. */
		containers: ['PRE'],
		/**
		 * Role archetype → seeded username, or null where the app has no
		 * such user group. OPS installs FIVE groups (manager,
		 * editorialBoardMember, sectionEditor, author, reader), so
		 * reviewer / internalReviewer / copyeditor are null and
		 * `seniorEditor` resolves to the manager — OPS ships no editor
		 * group, and the manager is its highest editorial actor.
		 */
		actors: {
			siteAdmin: 'admin',
			manager: 'manager.maya',
			seniorEditor: 'manager.maya',
			sectionEditor: 'sectioneditor.ana',
			reviewer: null,
			internalReviewer: null,
			copyeditor: null,
			author: 'author.alex',
			reader: 'reader.rosa',
		},
	},
};
