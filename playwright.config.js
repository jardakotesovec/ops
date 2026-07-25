// @ts-check

// OPS Playwright config. All logic lives in the shared factory in lib/pkp
// so OJS/OMP/OPS stay in sync; this stub declares the app name and the
// base port of OPS's dev-server block (worker N -> 8200 + N), which keeps
// the OPS fleet clear of OJS (8000-8099) and OMP (8100-8199).
module.exports = require('./lib/pkp/playwright/config-factory.js')({
	app: 'ops',
	basePort: 8200,
});
