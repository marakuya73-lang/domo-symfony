<?php

declare(strict_types=1);

namespace App\Experience;

/**
 * One frame in a horizontal, scroll-snapped strip.
 */
final readonly class ReelSlide
{
    public function __construct(
        public string $id,
        public string $still,
        public string $poster,
        public string $altPt,
        public string $altEn,
        public string $video = '',
        public ?string $titlePt = null,
        public ?string $titleEn = null,
        public ?string $bodyPt = null,
        public ?string $bodyEn = null,
    ) {
    }
}

/**
 * A full-screen strip. Copy on each slide appears once that slide has settled.
 *
 * @param list<ReelSlide> $slides
 */
final readonly class Reel
{
    public function __construct(
        public string $id,
        public array $slides,
    ) {
    }
}
