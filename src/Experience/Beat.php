<?php

declare(strict_types=1);

namespace App\Experience;

final readonly class Beat
{
    public function __construct(
        public string $type,
        public ?Scene $scene = null,
        public ?Hub $hub = null,
    ) {
    }

    public static function scene(Scene $scene): self
    {
        return new self('scene', $scene);
    }

    public static function hub(Hub $hub): self
    {
        return new self('hub', null, $hub);
    }
}
