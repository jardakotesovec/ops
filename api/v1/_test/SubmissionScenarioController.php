<?php

/**
 * @file api/v1/_test/SubmissionScenarioController.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class SubmissionScenarioController
 *
 * @ingroup api_v1_test
 *
 * @brief OPS subclass for the submission scenario endpoint.
 *
 * OPS shares OJS's submission container (`section` → publication
 * `sectionId`) and its galley-based representation model, so it declares
 * the same two overlays. `section` is required and not merely by
 * convention: OPS's schemas/publication.json lists `sectionId` in its
 * `required` block, so a sectionless preprint cannot be persisted.
 *
 * What OPS does NOT declare is `issue` — preprints post continuously and
 * OPS has no Repo::issue() — and it swaps in a decision processor whose
 * roster is narrowed to the five decision types OPS registers, since the
 * application has no review stage for the shared review vocabulary to
 * act on.
 */

namespace APP\API\v1\_test;

use APP\testing\scenario\Processor\DecisionProcessor;
use PKP\API\v1\_test\PKPSubmissionScenarioController;
use PKP\testing\scenario\Processor\DecisionProcessor as PKPDecisionProcessor;
use PKP\testing\scenario\Processor\ReviewRoundProcessor;

class SubmissionScenarioController extends PKPSubmissionScenarioController
{
    protected function schemaOverlayProperties(): array
    {
        return [
            'section' => ['type' => 'string', 'minLength' => 1],
        ];
    }

    protected function schemaRequiredOverlay(): array
    {
        return ['section'];
    }

    /**
     * Preprint galleys — same shape as OJS's, hence the same shared
     * $defs/galley building block.
     */
    protected function schemaOverlayDefProperties(): array
    {
        return [
            'publication' => [
                'galleys' => [
                    'type' => 'array',
                    'items' => ['$ref' => '#/$defs/galley'],
                ],
            ],
        ];
    }

    protected function newDecisionProcessor(ReviewRoundProcessor $reviewRoundProcessor): PKPDecisionProcessor
    {
        return new DecisionProcessor($reviewRoundProcessor);
    }
}
