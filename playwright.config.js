// @ts-check

// OPS Playwright config. All logic lives in the shared factory in lib/pkp
// so OJS/OMP/OPS stay in sync; this stub declares the app name and the
// base port of OPS's dev-server block (worker N -> 8200 + N), which keeps
// the OPS fleet clear of OJS (8000-8099) and OMP (8100-8199).
//
// sharedTests: false — the shared feature specs in
// lib/pkp/playwright/tests/ are still OJS-flavoured below the payload
// level (section-keyed scenario specs, the scenarios/journal alias, stage
// labels, decision rosters), and most of the cluster they cover does not
// exist on OPS at all. Running them here today produces a wall of
// failures that says nothing about OPS. Turning this on IS the
// "shared-test purge probe" milestone — MULTIAPP-PLAN §5.6 / §7.3. The
// shared bootstrap.setup.js is unaffected and always runs.
module.exports = require('./lib/pkp/playwright/config-factory.js')({
	app: 'ops',
	basePort: 8200,
	sharedTests: false,
});
