<?php

declare(strict_types=1);

namespace App\Experience;

/**
 * The first screen of a branch: discover the path, or leave to book.
 */
final readonly class Fork
{
    public function __construct(
        public string $id,
        public string $titlePt,
        public string $titleEn,
        public ?string $bodyPt,
        public ?string $bodyEn,
        public string $still,
        public string $altPt,
        public string $altEn,
        public string $discoverHref,
        public string $discoverPt,
        public string $discoverEn,
        public bool $rajaaram = false,
    ) {
    }
}
