// @ts-check
const {
	test,
	expect,
} = require('../../lib/pkp/playwright/support/base-test.js');
const {
	WorkflowShellPage,
} = require('../../lib/pkp/playwright/pages/WorkflowShellPage.js');

/**
 * Assign & manage reviewers — the OPS companion: the CODIFIED ABSENCE.
 *
 * The shared feature spec
 * (docs/product/specs/assign-and-manage-reviewers.md) is badged
 * `{OJS OMP}` and its "App variations — OPS" section reads **"Absent —
 * nothing here exists in OPS"**: a preprint is created in the Production
 * stage and never leaves it, so a review round can never arise; no
 * reviewer user group exists; the Reviewers panel is never mounted and
 * the Add Reviewer picker never opens. This single test is the gate that
 * keeps that claim honest — an absence nobody re-checks is an absence
 * that quietly comes back (MULTIAPP-PLAN §7.1, unmarked parity).
 *
 * Budget: tier H·12 → ceil(12/2) = 6 app-only tests allowed per app
 * (MULTIAPP-PLAN §4); ONE is written, because an absent feature has
 * exactly one behaviour. It asserts the three shapes the spec's OPS
 * paragraph names, each with a positive control so "nothing rendered"
 * can never pass for "the feature is absent":
 *
 *   1  no Reviewers panel and no Add Reviewer control in ANY workflow
 *      view — editorial (manager and moderator) and the author's own —
 *      and no review-stage entry in the workflow menu;
 *   2  no reviews route: `api/v1/reviews/{id}` is not found, i.e. the
 *      per-assignment API the panel's actions call is unreachable;
 *   3  the ONE shape nuance the paragraph records as inert: the shared
 *      user-directory route that feeds the picker — `GET
 *      api/v1/users/reviewers` — remains reachable and answers with an
 *      EMPTY reviewer list, because no reviewer group exists to
 *      populate it.
 *
 * Not covered, deliberately: the author-facing grid's
 * routable-but-authorization-refused address (the spec's second inert
 * nuance) — it is a legacy component-router shape whose refusal is
 * indistinguishable from a plain authorization failure, so a test would
 * assert the framework, not this feature. Live-probed 2026-07-26,
 * .reports/multiapp-trial-pilot2-probes.md §1.3.
 *
 * Conventions from docs/e2e/PRINCIPLES.md: the bootstrapped
 * `publicknowledge` preprint server stays read-only (the submission is
 * additive and per-test), unique hyphenless tag, no hard-coded waits, no
 * Mailpit reads (OPS seeds no review mailable at all). Personas resolve
 * through `appContext.seed.actors` — never a hard-coded username: OPS
 * installs five user groups, `seniorEditor` is the Preprint Server
 * Manager here, and `reviewer` is `null` by construction (G4 §4.1),
 * which is the whole point of this file.
 */

/** A unique, hyphenless, alphanumeric tag (parallel isolation). */
function uniqueTag(prefix = 'amrops') {
	const workerLetter = String.fromCharCode(
		97 + (test.info().parallelIndex % 26),
	);
	let suffix = '';
	while (suffix.length < 6) {
		suffix += Math.random().toString(36).replace(/[^a-z0-9]/g, '');
	}
	return `${prefix}${workerLetter}${suffix.slice(0, 6)}`;
}

/** Scenario spec for a submitted preprint carrying the tag in its title. */
function preprintSpec(appContext, {tag}) {
	const {actors, contextPath, containers} = appContext.seed;
	return {
		tag,
		context: contextPath,
		submitter: actors.author,
		// OPS keeps OJS's container (`section`) and it is REQUIRED here.
		[appContext.submissionContainerKey]: containers[0],
		locale: 'en',
		submitted: true,
		participants: [{user: actors.sectionEditor, role: 'sectionEditor'}],
		publications: [
			{
				versionStage: 'AO',
				published: false,
				metadata: {
					title: {en: `Reviewer management ${tag}`},
					abstract: {en: `<p>Assign-and-manage-reviewers absence fixture ${tag}.</p>`},
				},
			},
		],
	};
}

test.describe('Assign & manage reviewers — OPS absence', () => {
	// Capability gate, never an app-name check (MULTIAPP-PLAN §3): this
	// file describes what an app with no review stage does, so it is
	// meaningful exactly where the capability is false. `hasReviewerRoles`
	// is checked too — the absence has two independent causes (no stage,
	// no user group) and either one returning would invalidate the test.
	test.beforeEach(async ({appContext}) => {
		test.skip(
			appContext.hasReviewStage || appContext.hasReviewerRoles,
			'This companion codifies the absence of the reviewer surface.',
		);
	});

	test('"Absent — nothing here exists in OPS": no Reviewers panel in any workflow view and no reviews route, while the shared user-directory reviewer route stays reachable and answers empty', async ({
		appContext,
		asUser,
		pkpApi,
	}) => {
		test.slow(); // three actors + three API probes
		const tag = uniqueTag();
		const {actors, contextPath} = appContext.seed;
		const {submission} = await pkpApi.createSubmission(
			preprintSpec(appContext, {tag}),
		);

		// The app itself declares there is no reviewer to seed: the
		// archetype resolves to null, so no persona in this file could
		// even hold a review assignment.
		expect(actors.reviewer).toBeNull();

		// --- 1. No reviewer surface in any editorial workflow view. ---
		/** @type {import('@playwright/test').Page} */
		let managerPage;
		for (const archetype of ['seniorEditor', 'sectionEditor']) {
			const ctx = await asUser(actors[archetype]);
			const page = await ctx.newPage();
			const shell = new WorkflowShellPage(page, {journalPath: contextPath});
			await shell.gotoEditorial(submission.id);

			// Positive control: the workflow really rendered, on the only
			// stage this app has.
			await expect(
				shell.contentHeading('Workflow: Production'),
			).toBeVisible({timeout: 20_000});

			await expect(page.locator('[data-cy="reviewer-manager"]')).toHaveCount(0);
			await expect(
				page.getByRole('button', {name: 'Add Reviewer', exact: true}),
			).toHaveCount(0);
			// …and no stage entry the panel could ever mount on.
			for (const absent of [
				'Review',
				'Internal Review',
				'External Review',
				'Review Round 1',
			]) {
				await expect(shell.menuItem(absent)).toHaveCount(0);
			}
			// The manager's session carries the API probes below (the
			// reviewer directory is a managerial route).
			if (archetype === 'seniorEditor') {
				managerPage = page;
			} else {
				await page.close();
			}
		}

		// The author's own view: no redacted variant either — the panel's
		// author-facing half needs a completed open review, and no review
		// can exist.
		const authorCtx = await asUser(actors.author);
		const authorPage = await authorCtx.newPage();
		const authorShell = new WorkflowShellPage(authorPage, {
			journalPath: contextPath,
		});
		await authorShell.gotoTracking(submission.id);
		// Positive control: the author's tracking view rendered. It lands
		// on the version, not on a stage, and carries no Workflow group at
		// all on OPS (workflow-stage-navigation, OPS v14/v16) — so there
		// is not even a place for a redacted panel to mount.
		await expect(
			authorShell.contentHeading('Preprint: Title & Abstract'),
		).toBeVisible({timeout: 20_000});
		await expect(
			authorPage.locator('[data-cy="reviewer-manager"]'),
		).toHaveCount(0);
		for (const absent of ['Review', 'Review Round 1']) {
			await expect(authorShell.menuItem(absent)).toHaveCount(0);
		}

		// --- 2. No reviews route: the per-assignment API the panel's
		// actions call is not mounted (OPS ships no api/v1/reviews). ---
		const notFound = await managerPage.request.get(
			`/index.php/${contextPath}/api/v1/reviews/${submission.id}`,
		);
		expect(notFound.status()).toBe(404);

		// --- 3. The inert nuance the spec's OPS paragraph records: the
		// shared user-directory route that feeds the picker IS reachable
		// and answers with an empty reviewer list — no reviewer group
		// exists to populate it. Positive control: the same users
		// controller returns the server's real user roster. ---
		const reviewers = await managerPage.request.get(
			`/index.php/${contextPath}/api/v1/users/reviewers`,
		);
		expect(reviewers.status()).toBe(200);
		const reviewerPage = await reviewers.json();
		expect(reviewerPage.itemsMax).toBe(0);
		expect(reviewerPage.items).toEqual([]);

		const users = await managerPage.request.get(
			`/index.php/${contextPath}/api/v1/users`,
		);
		expect(users.status()).toBe(200);
		expect((await users.json()).itemsMax).toBeGreaterThan(0);
	});
});
