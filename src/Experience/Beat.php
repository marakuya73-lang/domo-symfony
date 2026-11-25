<?php

declare(strict_types=1);

namespace App\Experience;

final readonly class Beat
{
    public function __construct(
        public string $type,
        public ?Scene $scene = null,
        public ?Hub $hub = null,
        public ?Fork $fork = null,
        public ?Reel $reel = null,
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

    public static function fork(Fork $fork): self
    {
        return new self('fork', null, null, $fork);
    }

    public static function reel(Reel $reel): self
    {
        return new self('reel', null, null, null, $reel);
    }
}
