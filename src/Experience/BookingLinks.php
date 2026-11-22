<?php

declare(strict_types=1);

namespace App\Experience;

/**
 * Public booking destinations. The preview never invents a second phone number.
 */
final readonly class BookingLinks
{
    public function __construct(
        public string $stayPt,
        public string $stayEn,
        public string $eventPt,
        public string $eventEn,
        public string $massagePt,
        public string $massageEn,
        public string $airbnb,
        public string $rajaaram,
        public string $phone,
        public string $concierge,
    ) {
    }
}
