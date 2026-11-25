<?php

declare(strict_types=1);

namespace App\Twig;

use App\Experience\MediaManifest;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

final class MediaExtension extends AbstractExtension
{
    public function __construct(private readonly MediaManifest $media)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('media', $this->media->get(...)),
        ];
    }
}
