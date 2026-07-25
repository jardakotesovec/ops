<?php

/**
 * @file classes/testing/scenario/Processor/DecisionProcessor.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class DecisionProcessor
 *
 * @brief OPS decision vocabulary — a REPLACEMENT for the shared roster,
 *        not an extension of it.
 *
 * OPS is the one application that subtracts. It has a single workflow
 * stage (production), no review stage at all, and
 * APP\decision\Repository::getDecisionTypes() registers exactly five
 * types. The shared roster's review-flow names (sendExternalReview,
 * requestRevisions, newExternalRound, …) have no DecisionType behind them
 * here, so this class narrows the map instead of widening it: a spec
 * naming one of them now fails at the map with a list of what OPS
 * actually supports, rather than deeper in with
 * "No DecisionType registered for constant 3".
 *
 * roundCreatingDecisions() is empty for the same reason — nothing in OPS
 * can create a review round, so a spec carrying reviewRounds[] simply
 * never has them consumed. Tests should assert absence via the app, not
 * by seeding rounds that cannot exist.
 */

namespace APP\testing\scenario\Processor;

use PKP\decision\Decision;
use PKP\testing\scenario\Processor\DecisionProcessor as PKPDecisionProcessor;

class DecisionProcessor extends PKPDecisionProcessor
{
    /**
     * Spec name => Decision constant, restricted to what OPS registers.
     * `initialDecline` / `revertInitialDecline` keep the shared spelling
     * (OPS's Decline/RevertDecline subclass the PKP InitialDecline /
     * RevertInitialDecline types and return their constants), so a spec
     * that declines a submission reads identically on all three apps.
     */
    protected function decisionMap(): array
    {
        return [
            'initialDecline' => Decision::INITIAL_DECLINE,
            'revertInitialDecline' => Decision::REVERT_INITIAL_DECLINE,
            'moveToDone' => Decision::MOVE_TO_DONE,
            'returnToWorkflow' => Decision::RETURN_TO_WORKFLOW,
            'returnToDone' => Decision::RETURN_TO_DONE,
        ];
    }

    /** OPS has no review stage; no decision creates a review round. */
    protected function roundCreatingDecisions(): array
    {
        return [];
    }
}
