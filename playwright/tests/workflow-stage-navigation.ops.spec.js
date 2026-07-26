// @ts-check
const {
	test,
	expect,
} = require('../../lib/pkp/playwright/support/base-test.js');
const {
	WorkflowShellPage,
} = require('../../lib/pkp/playwright/pages/WorkflowShellPage.js');

/**
 * Workflow stage navigation — the OPS companion.
 *
 * Thin app companion to the shared feature spec
 * (docs/product/specs/workflow-stage-navigation.md); it covers ONLY the
 * deltas that spec's "App variations — OPS" section declares
 * (MULTIAPP-PLAN §3). Budget: tier M·6 → at most ceil(6/2) = 3 app-only
 * tests per app (§4), all three spent on the single-stage topology: OPS
 * is the app that REMOVES, and every override below follows from
 * `Application::getApplicationStages() === [5]`.
 *
 * Test titles quote the App-variations stubs they test:
 *   1  "listing all four stages" — a single Production entry (+ "Below
 *      Workflow sits a Publication group" → "Preprint", "Metadata and
 *      JATS XML", "the submission reaches Copyediting")
 *   2  "follows the submission's state" — the collapsed landings (+
 *      "leads with a status box", the posted-preprint stripe)
 *   3  "funnel to the editorial dashboard" / "shows a single sentence" —
 *      the three absent-stage addresses are refused for everyone, and
 *      the no-access sentence survives on OPS only as a full-page refusal
 *
 * Overrides deliberately NOT covered (budget): the author tracking view's
 * missing Workflow group (owned by the author-dashboard delta) and the
 * Scheduled indicator state (its trigger belongs to the OPS publishing
 * feature). Both were live-probed 2026-07-26, pilot-1 batch B.
 *
 * Conventions from docs/e2e/PRINCIPLES.md: the bootstrapped
 * `publicknowledge` preprint server stays read-only (submissions are
 * additive and per-test), unique hyphenless tags, no hard-coded waits, no
 * Mailpit reads. Personas resolve through `appContext.seed.actors` —
 * never a hard-coded username: OPS installs five user groups and has no
 * Editor group at all, so `seniorEditor` is the Preprint Server Manager
 * here and `reviewer` / `copyeditor` do not exist (G4 §4.1).
 */

/** A unique, hyphenless, alphanumeric tag (parallel isolation). */
function uniqueTag(prefix = 'wsnops') {
	const workerLetter = String.fromCharCode(
		97 + (test.info().parallelIndex % 26),
	);
	let suffix = '';
	while (suffix.length < 6) {
		suffix += Math.random().toString(36).replace(/[^a-z0-9]/g, '');
	}
	return `${prefix}${workerLetter}${suffix.slice(0, 6)}`;
}

/** The menu's group headers, in DOM order. */
async function groupHeaders(shell) {
	return shell
		.nav()
		.locator('[data-pc-section="header"][aria-label]')
		.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')));
}

/**
 * Scenario spec for a preprint carrying the tag in its title.
 *
 * @param {object} appContext the app capability map (vocabulary + actors)
 */
function preprintSpec(appContext, {tag, title, decisions, publication = {}}) {
	const {actors, contextPath, containers} = appContext.seed;
	return {
		tag,
		context: contextPath,
		submitter: actors.author,
		// OPS keeps OJS's container: `section`, and it is REQUIRED here
		// (its publication schema lists sectionId) — G4 handoff item 5.
		[appContext.submissionContainerKey]: containers[0],
		locale: 'en',
		submitted: true,
		participants: [{user: actors.sectionEditor, role: 'sectionEditor'}],
		...(decisions ? {decisions} : {}),
		publications: [
			{
				versionStage: 'AO', // on OPS the Author Original IS the version of record
				published: false,
				metadata: {
					title: {en: title},
					abstract: {en: `<p>Abstract for ${tag}.</p>`},
				},
				...publication,
			},
		],
	};
}

test.describe('Workflow stage navigation — OPS variations', () => {
	// Capability gate, never an app-name check (MULTIAPP-PLAN §3): this
	// companion describes what a one-stage app does, so it is meaningful
	// exactly where the review stage is absent.
	test.beforeEach(async ({appContext}) => {
		test.skip(
			appContext.hasReviewStage,
			'This companion covers the single-stage (no review) topology.',
		);
	});

	test('"listing all four stages" — the Workflow group holds a single Production entry: no Review, no rounds, a "Preprint" group instead of Publication, no JATS XML or Identifiers, and Preview offered from the start', async ({
		appContext,
		asUser,
		pkpApi,
	}) => {
		test.slow(); // one seed + a full menu/roster read
		const tag = uniqueTag('wsnopsa');
		const title = `Single stage menu ${tag}`;
		const {submission} = await pkpApi.createSubmission(
			preprintSpec(appContext, {tag, title}),
		);

		const ctx = await asUser(appContext.seed.actors.seniorEditor);
		const page = await ctx.newPage();
		const shell = new WorkflowShellPage(page, {
			journalPath: appContext.seed.contextPath,
		});
		await shell.gotoEditorial(submission.id);

		// A queued preprint lands on the Production entry — the only
		// workflow entry there is (v11, v14).
		await expect(shell.contentHeading('Workflow: Production')).toBeVisible({
			timeout: 20_000,
		});
		await expect(page).toHaveURL(
			new RegExp(`workflowMenuKey=workflow_${appContext.initialStageId}(&|$)`),
		);
		await expect(shell.header()).toContainText('Production');
		await expect(shell.indicatorDot()).toHaveClass(/bg-stage-production/);

		// The whole stage topology: one entry, carrying the current-stage
		// stripe. No Review entry, no round sub-entries, no Submission or
		// Copyediting entry exists anywhere in the menu.
		await expect(shell.menuItem('Production')).toBeVisible();
		await expect(shell.menuItem('Production')).toHaveClass(
			/border-stage-production/,
		);
		for (const absent of [
			'Submission',
			'Review',
			'Internal Review',
			'External Review',
			'Review Round 1',
			'Copyediting',
		]) {
			await expect(shell.menuItem(absent)).toHaveCount(0);
		}

		// "Below Workflow sits a Publication group" — on OPS the group's
		// on-screen header reads "Preprint", and only these two groups
		// exist to start out expanded (v19, v11).
		expect(await groupHeaders(shell)).toEqual(['Workflow', 'Preprint']);

		// The version roster: no JATS XML, and an Identifiers entry can
		// NEVER appear — the app ships no public-identifier plugin, even
		// though the seeded server has DOIs enabled (v12).
		for (const item of [
			'Title & Abstract',
			'Contributors',
			'Metadata',
			'References',
			'Galleys',
			'Media',
			'Permissions & Disclosure',
			'Preprint entry',
		]) {
			await expect(shell.menuItem(item)).toBeVisible();
		}
		for (const never of ['JATS XML', 'Identifiers', 'Body Text']) {
			await expect(shell.menuItem(never)).toHaveCount(0);
		}

		// "the submission reaches Copyediting" — from the start: every
		// unposted preprint already sits in Production, so Preview is
		// offered immediately (v13).
		await expect(shell.headerButton('Preview')).toBeVisible();
		await expect(shell.headerButton('Activity Log')).toBeVisible();
		await expect(shell.headerButton('Library')).toBeVisible();
		await expect(shell.headerButton('View')).toHaveCount(0);
	});

	test('"follows the submission\'s state" — the landings collapse: a posted preprint opens on its latest version, loses the stage stripe and shows the blank-stage status box; a declined one opens on its version too, not on the stage it was declined in', async ({
		appContext,
		asUser,
		pkpApi,
	}) => {
		test.slow(); // two seeds, two panels
		const tag = uniqueTag('wsnopsb');
		const {submission: posted} = await pkpApi.createSubmission(
			preprintSpec(appContext, {
				tag: `${tag}p`,
				title: `Posted preprint ${tag}p`,
				publication: {published: true},
			}),
		);
		const {submission: declined} = await pkpApi.createSubmission(
			preprintSpec(appContext, {
				tag: `${tag}d`,
				title: `Declined preprint ${tag}d`,
				decisions: [
					{
						type: 'initialDecline',
						by: appContext.seed.actors.seniorEditor,
					},
				],
			}),
		);

		const ctx = await asUser(appContext.seed.actors.seniorEditor);
		const page = await ctx.newPage();
		const shell = new WorkflowShellPage(page, {
			journalPath: appContext.seed.contextPath,
		});

		// --- Posted: lands on the latest version's Title & Abstract. ---
		await shell.gotoEditorial(posted.id);
		await expect(
			shell.contentHeading('Preprint: Title & Abstract'),
		).toBeVisible({timeout: 20_000});
		await expect(page).toHaveURL(/workflowMenuKey=publication_\d+_titleAbstract/);
		await expect(shell.header()).toContainText('Published');
		// Posting parks the preprint on an internal past-the-end marker
		// with no menu entry of its own, so no entry carries the stripe.
		await expect(shell.nav().locator('a[class*="border-stage-"]')).toHaveCount(
			0,
		);
		// The header is relabeled and gains a fourth button (v13).
		await expect(shell.headerButton('View')).toBeVisible();
		await expect(shell.headerButton('Return to Workflow')).toBeVisible();
		await expect(shell.headerButton('Preview')).toHaveCount(0);

		// "leads with a status box" — the ONE box that can occur on OPS,
		// and it is the base spec's blank-stage passed-stage sentence
		// (Known deviations, ledger row 262), never "Submission published."
		await shell.clickMenu('Production');
		await expect(shell.contentHeading('Workflow: Production')).toBeVisible();
		await expect(
			shell.primaryItems().getByRole('heading', {name: 'Status'}),
		).toBeVisible();
		// Read the raw text: the defect IS the missing stage token, and
		// Playwright's text matchers normalize the tell-tale double space.
		const boxText = await shell.primaryItems().evaluate((el) => el.textContent);
		expect(boxText).toContain('The submission is currently in the  stage.');
		expect(boxText).not.toContain('Submission published.');

		// --- Declined: also lands on the version, NOT on the stage it was
		// declined in — the base rule-9 sentence does not carry over. ---
		await shell.gotoEditorial(declined.id);
		await expect(
			shell.contentHeading('Preprint: Title & Abstract'),
		).toBeVisible({timeout: 20_000});
		await expect(page).toHaveURL(/workflowMenuKey=publication_\d+_titleAbstract/);
		await expect(shell.header()).toContainText('Declined');
		await expect(shell.indicatorDot()).toHaveClass(/bg-stage-declined/);
		// Queued, scheduled, declined and unfinished preprints show no box.
		await shell.clickMenu('Production');
		await expect(shell.contentHeading('Workflow: Production')).toBeVisible();
		await expect(
			shell.primaryItems().getByRole('heading', {name: 'Status'}),
		).toHaveCount(0);
	});

	test('"funnel to the editorial dashboard" — only the entry-check and the production-named shapes do: the three absent-stage addresses are refused for every viewer with "A workflow stage was not specified.", and the no-access sentence survives only as a full-page refusal', async ({
		appContext,
		asUser,
		pkpApi,
	}) => {
		test.slow(); // three actors, ten navigations
		const tag = uniqueTag('wsnopsc');
		const {submission} = await pkpApi.createSubmission(
			preprintSpec(appContext, {tag, title: `Legacy addresses ${tag}`}),
		);
		const {contextPath, actors} = appContext.seed;
		const legacy = (op) =>
			`/index.php/${contextPath}/en/workflow/${op}/${submission.id}`;
		// The three shapes name stages this app does not have.
		const absentStageOps = ['submission', 'externalReview', 'editorial'];

		// The refusal is universal — a permission-independent "this
		// address is dead on OPS", so the Preprint Server Manager is
		// refused exactly like an assigned Moderator (v15).
		for (const archetype of ['seniorEditor', 'sectionEditor']) {
			const ctx = await asUser(actors[archetype]);
			const page = await ctx.newPage();
			for (const op of absentStageOps) {
				await page.goto(legacy(op), {waitUntil: 'commit'});
				await page.waitForURL(/user\/authorizationDenied/, {
					timeout: 20_000,
					waitUntil: 'commit',
				});
				await expect(page).toHaveURL(
					/message=user\.authorization\.workflowStageRequired/,
				);
				await expect(
					page.getByText('A workflow stage was not specified.'),
				).toBeVisible();
			}
		}

		// The two shapes that name a stage OPS does have behave exactly as
		// the base spec says: production redirects in two hops (dropping
		// the stage), the entry-check address in one.
		const editorCtx = await asUser(actors.seniorEditor);
		const editorPage = await editorCtx.newPage();
		const shell = new WorkflowShellPage(editorPage, {
			journalPath: contextPath,
		});
		for (const op of ['production', 'access']) {
			await editorPage.goto(legacy(op), {waitUntil: 'commit'});
			await editorPage.waitForURL(/dashboard\/editorial\?/, {
				timeout: 20_000,
				waitUntil: 'commit',
			});
			await expect(editorPage).toHaveURL(
				new RegExp(`workflowSubmissionId=${submission.id}`),
			);
			await expect(shell.contentHeading('Workflow: Production')).toBeVisible({
				timeout: 20_000,
			});
		}

		// "shows a single sentence" — it cannot occur inside the panel on a
		// one-stage app; the sentence remains reachable only as the
		// full-page refusal on a legacy address, and it is a DIFFERENT
		// refusal from the one above (v20, v15).
		const authorCtx = await asUser(actors.author);
		const authorPage = await authorCtx.newPage();
		for (const op of ['production', 'access']) {
			await authorPage.goto(legacy(op), {waitUntil: 'commit'});
			await authorPage.waitForURL(/user\/authorizationDenied/, {
				timeout: 20_000,
				waitUntil: 'commit',
			});
			await expect(authorPage).toHaveURL(
				/message=user\.authorization\.accessibleWorkflowStage/,
			);
			await expect(
				authorPage.getByText(WorkflowShellPage.NO_ACCESS_SENTENCE),
			).toBeVisible();
		}
	});
});
