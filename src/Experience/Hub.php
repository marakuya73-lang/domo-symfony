<?php

declare(strict_types=1);

namespace App\Experience;

final readonly class HubCard
{
    public function __construct(
        public string $href,
        public string $titlePt,
        public string $titleEn,
        public string $image,
        public string $altPt,
        public string $altEn,
    ) {
    }
}

final readonly class Hub
{
    /**
     * @param list<HubCard> $cards
     */
    public function __construct(
        public string $id,
        public string $titlePt,
        public string $titleEn,
        public array $cards,
    ) {
    }
}
