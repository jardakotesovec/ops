<?php

/**
 * @file api/v1/_test/ServerScenarioController.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class ServerScenarioController
 *
 * @ingroup api_v1_test
 *
 * @brief OPS subclass of PKPContextScenarioController. Registers
 *        POST /api/v1/_test/scenarios/server — the OPS vocabulary alias
 *        of the canonical cross-app POST /api/v1/_test/scenarios/context.
 *
 * OPS sections have the same shape as OJS sections (abbrev + title;
 * OPS's ContextService even seeds a default one at context creation), so
 * the shared SectionProcessor is used unmodified and this class carries
 * no processor overrides at all. That is the intended end state for a
 * shared-identical area: the app file exists only to name the route.
 */

namespace APP\API\v1\_test;

use Illuminate\Support\Facades\Route;
use PKP\API\v1\_test\PKPContextScenarioController;

class ServerScenarioController extends PKPContextScenarioController
{
    public function getGroupRoutes(): void
    {
        parent::getGroupRoutes();

        Route::post('server', $this->context(...))
            ->name('test.scenarios.server');
    }

    protected function scratchPathPrefix(): string
    {
        return 's-';
    }
}
