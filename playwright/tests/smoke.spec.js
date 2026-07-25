// @ts-check
const {
	test,
	expect,
} = require('../../lib/pkp/playwright/support/base-test.js');
const {LoginPage} = require('../../lib/pkp/playwright/pages/LoginPage.js');
const {DashboardPage} = require('../../lib/pkp/playwright/pages/DashboardPage.js');
const {getPassword} = require('../../lib/pkp/playwright/data/users.js');

/**
 * OPS harness smoke test — the M0-lite G4 gate.
 *
 * Deliberately trivial and deliberately end-to-end: it proves the whole
 * app tree is wired, not that OPS works. If it is green, then
 *   - playwright.config.js resolved the shared factory on OPS's 8200 port
 *     block and spawned a PHP server there,
 *   - the shared bootstrap.setup.js installed OPS and seeded the baseline
 *     preprint server via the canonical /_test/scenarios/context route,
 *   - playwright/support/app.context.js loads and agrees with the
 *     Playwright project name,
 *   - a seeded identity can authenticate, and
 *   - the shared lib/ui-library editorial dashboard mounts and renders.
 *
 * Feature coverage belongs in shared specs (capability-gated) and in thin
 * `<feature>.ops.spec.js` companions — never here.
 */
test.describe('harness smoke', () => {
	test('seeded admin logs in and the editorial dashboard renders', async ({
		page,
		appContext,
	}) => {
		// The capability map is loaded from the app checkout, not guessed.
		expect(appContext.app).toBe('ops');
		expect(appContext.hasReviewStage).toBe(false);

		const login = new LoginPage(page);
		await login.login('admin', getPassword('admin'), 'index');
		await page.waitForURL((url) => !url.pathname.includes('/login'), {
			waitUntil: 'commit',
		});

		const dashboard = new DashboardPage(page, {
			journal: appContext.seed.contextPath,
		});
		await dashboard.gotoEditorial();

		// The dashboard h1 is `${view name} (${count})` — assert the shape,
		// never a specific count or a specific landing view.
		const heading = page.getByRole('heading', {level: 1});
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText(/\(\d+\)/);
	});
});
