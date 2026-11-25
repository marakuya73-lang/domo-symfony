<?php

declare(strict_types=1);

namespace App\Experience;

use Symfony\Component\Asset\Packages;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Responsive variants and the instant placeholder for one source image.
 */
final class MediaManifest
{
    /** @var array<string, array<string, mixed>>|null */
    private ?array $items = null;

    public function __construct(
        private readonly Packages $packages,
        #[Autowire('%kernel.project_dir%/public/media/experience/responsive-manifest.json')]
        private readonly string $manifestPath,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function get(string $relativePath): array
    {
        $item = $this->items()[$relativePath] ?? null;
        if (!is_array($item)) {
            throw new \InvalidArgumentException(sprintf('No responsive image for "%s".', $relativePath));
        }

        $avif = $this->srcset($item['avif'] ?? []);
        $webp = $this->srcset($item['webp'] ?? []);
        $jpg = $this->srcset($item['jpg'] ?? []);
        $jpgMap = $item['jpg'] ?? [];
        $fallbackWidth = $this->closestWidth($jpgMap, 828);
        $posterWidth = $this->closestWidth($jpgMap, 480);
        $avifMap = $item['avif'] ?? [];

        return [
            'width' => (int) $item['width'],
            'height' => (int) $item['height'],
            'color' => (string) $item['color'],
            'lqip' => (string) $item['lqip'],
            'avif' => $avif,
            'webp' => $webp,
            'jpg' => $jpg,
            'src' => $this->packages->getUrl((string) $jpgMap[(string) $fallbackWidth]),
            'poster' => $this->packages->getUrl((string) $jpgMap[(string) $posterWidth]),
            'w480' => $this->urlFor($avifMap, 480),
            'w828' => $this->urlFor($avifMap, 828),
            'w1280' => $this->urlFor($avifMap, 1280),
        ];
    }

    /**
     * @param array<string|int, string> $map
     */
    private function srcset(array $map): string
    {
        $parts = [];
        foreach ($map as $width => $path) {
            $parts[] = $this->packages->getUrl($path).' '.$width.'w';
        }

        return implode(', ', $parts);
    }

    /**
     * @param array<string|int, string> $map
     */
    private function closestWidth(array $map, int $target): int
    {
        $widths = array_map(intval(...), array_keys($map));
        sort($widths);
        $chosen = $widths[0] ?? $target;
        foreach ($widths as $width) {
            $chosen = $width;
            if ($width >= $target) {
                break;
            }
        }

        return $chosen;
    }

    /**
     * @param array<string|int, string> $map
     */
    private function urlFor(array $map, int $target): string
    {
        $width = $this->closestWidth($map, $target);

        return $this->packages->getUrl((string) $map[(string) $width]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function items(): array
    {
        if (null !== $this->items) {
            return $this->items;
        }

        $decoded = json_decode((string) file_get_contents($this->manifestPath), true);
        $this->items = is_array($decoded) ? $decoded : [];

        return $this->items;
    }
}
