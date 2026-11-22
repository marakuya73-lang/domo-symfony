<?php

declare(strict_types=1);

namespace App\Experience;

/**
 * A path opened from the break page. It is not part of the plain scroll.
 *
 * @param list<Beat> $beats
 */
final readonly class Branch
{
    public function __construct(
        public string $id,
        public string $labelPt,
        public string $labelEn,
        public array $beats,
    ) {
    }
}
