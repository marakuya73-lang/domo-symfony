<?php

declare(strict_types=1);

namespace App\Experience;

/**
 * One full-screen beat of the scroll story.
 */
final readonly class Scene
{
    public function __construct(
        public string $id,
        public string $video,
        public string $still,
        public string $poster,
        public string $align,
        public int $travel,
        public string $altPt,
        public string $altEn,
        public ?string $kickerPt = null,
        public ?string $kickerEn = null,
        public ?string $titlePt = null,
        public ?string $titleEn = null,
        public ?string $bodyPt = null,
        public ?string $bodyEn = null,
        public ?string $pricePt = null,
        public ?string $priceEn = null,
        public ?string $metaPt = null,
        public ?string $metaEn = null,
        public ?string $finePt = null,
        public ?string $fineEn = null,
        public bool $hero = false,
        public bool $finale = false,
        public bool $brief = false,
        public bool $placeholder = false,
        public ?string $smallPt = null,
        public ?string $smallEn = null,
        public ?string $anchor = null,
        public ?string $backHub = null,
        public ?string $nextHref = null,
    ) {
    }
}
