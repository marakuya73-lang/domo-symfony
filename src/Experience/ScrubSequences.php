<?php

declare(strict_types=1);

namespace App\Experience;

use Symfony\Component\Asset\Packages;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * One continuous canvas timeline per stage. Scroll distance is the frame
 * count times a fixed pixel step, so the picture advances on every scroll.
 * Clips overlap by a few frames and crossfade there. Stills are virtual
 * frames: the same image zooms and pans for the whole step.
 */
final class ScrubSequences
{
    private const PX = 10;
    private const OVERLAP = 8;
    private const STILL_FRAMES = 72;

    private int $panSign = 1;

    public function __construct(
        private readonly MediaManifest $media,
        private readonly Packages $packages,
        #[Autowire('%kernel.project_dir%/public/media/experience/seq/manifest.json')]
        private readonly string $manifestPath,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function journey(): array
    {
        return $this->finish('journey', [
            $this->frames('hero'),
            $this->frames('road'),
            $this->frames('walk'),
            $this->frames('dome'),
            $this->frames('deck'),
            $this->frames('interior'),
        ], [
            $this->cue('hero', 0, 0.9, 'center', [
                'hero' => true,
                'middle' => true,
                'view' => true,
                'kickerPt' => 'DOMO GEODÉSICO NA CHAPADA',
                'kickerEn' => 'GEODESIC DOME IN CHAPADA',
                'titlePt' => 'Domo Xangô',
                'titleEn' => 'Domo Xangô',
                'bodyPt' => 'Um santuário só seu, na borda da Chapada dos Veadeiros.',
                'bodyEn' => 'A sanctuary of your own, on the edge of Chapada dos Veadeiros.',
                'action' => 'hero',
            ]),
            $this->cue('road', 0.14, 0.86, 'left', [
                'titlePt' => 'Aqui, o tempo desacelera.',
                'titleEn' => 'Here, time slows down.',
                'bodyPt' => 'Catorze quilômetros de Alto Paraíso, estrada de terra, cerrado dos dois lados.',
                'bodyEn' => 'Fourteen kilometres from Alto Paraíso, a dirt road, cerrado on both sides.',
            ]),
            $this->cue('walk', 0.05, 0.36, 'right', [
                'titlePt' => 'Deixe o carro na entrada.',
                'titleEn' => 'Leave the car at the entrance.',
                'bodyPt' => 'Cem metros de subida pela mata, até o mundo ficar para trás.',
                'bodyEn' => 'A hundred metres up through the forest, until the world falls behind.',
            ]),
            $this->cue('walk', 0.48, 0.9, 'center', [
                'titlePt' => 'Mochila ou bagagem leve.',
                'titleEn' => 'A backpack or light bags.',
                'bodyPt' => 'A trilha é suave, mas rodinhas não gostam dela.',
                'bodyEn' => 'The path is gentle, but wheels don\'t love it.',
                'noticePt' => 'Visitas somente com reserva confirmada. Por favor, não apareça sem agendar.',
                'noticeEn' => 'Visits by confirmed reservation only. Please don\'t arrive without booking.',
            ]),
            $this->cue('dome', 0.12, 0.88, 'center', [
                'titlePt' => 'E então, o domo.',
                'titleEn' => 'And then, the dome.',
                'bodyPt' => 'Geometria sagrada, sozinho diante do vale. Só seu.',
                'bodyEn' => 'Sacred geometry, alone before the valley. All yours.',
            ]),
            $this->cue('deck', 0.16, 0.86, 'right', [
                'titlePt' => 'O deck é seu. O nascer do sol também.',
                'titleEn' => 'The deck is yours. So is the sunrise.',
                'bodyPt' => '340 m² de madeira suspensa sobre o vale. Ioga ao amanhecer, a lua nascendo à noite, 360° de estrelas.',
                'bodyEn' => '340 m² of wood suspended over the valley. Yoga at sunrise, the moon rising at night, 360° of stars.',
            ]),
            $this->cue('interior', 0.18, 0.88, 'left', [
                'titlePt' => 'Paraíso, no meio da mata.',
                'titleEn' => 'Paradise, in the heart of the forest.',
                'bodyPt' => 'Entre o canto dos pássaros e o cerrado, o horizonte é todo seu.',
                'bodyEn' => 'Between birdsong and the cerrado, the horizon is yours.',
            ]),
        ], 'posters/01_hero-start.jpg', null, false);
    }

    /**
     * @return array<string, mixed>
     */
    public function estadia(): array
    {
        return $this->finish('estadia', [
            $this->frames('interior', 4),
            $this->frames('stay2'),
            $this->still('stay-bed', 'v5/stay-2.jpg'),
            $this->still('falls', 'posters/09_falls-mid.jpg'),
            $this->still('falls-air', 'posters/09b_falls_aerial-mid.jpg'),
            $this->still('night-milkyway', 'v5/night-milkyway.jpg'),
            $this->still('night-moon', 'v5/night-moon-palms.jpg'),
            $this->still('moon', 'posters/10a_moon-mid.jpg'),
            $this->still('house', 'posters/03a_orbit-mid.jpg'),
            $this->still('sleep', 'posters/04b_5005-mid.jpg'),
            $this->still('cocoon', 'posters/04c_5004-mid.jpg'),
            $this->still('pyramid', 'posters/02b_pyramid-mid.jpg'),
            $this->still('kitchen', 'v5/stay-3.jpg'),
            $this->still('bath-1', 'v5/bath-1.jpg'),
            $this->still('bath-2', 'v5/bath-2.jpg'),
            $this->still('bath-3', 'v5/bath-3.jpg'),
            $this->still('bath-4', 'v5/bath-4.jpg'),
            $this->still('breakfast', 'v5/breakfast-deck.jpg'),
        ], [
            $this->cue('interior', 0, 0.4, 'center', [
                'middle' => true,
                'titlePt' => 'Fique. Respire. Fique mais um pouco.',
                'titleEn' => 'Stay. Breathe. Stay a little longer.',
                'action' => 'discover',
                'discoverHref' => '#estadia-dream',
                'discoverPt' => 'Descobrir o domo',
                'discoverEn' => 'Discover the dome',
                'scrubClip' => 'interior',
                'scrubLocal' => 0.55,
            ]),
            $this->cue('falls', 0.14, 0.86, 'right', [
                'titlePt' => 'A dez minutos, a água fria te chama.',
                'titleEn' => 'Ten minutes away, the cold water calls.',
                'bodyPt' => 'Anjos e Arcanjos: duas quedas, um rio, poços para mergulhar.',
                'bodyEn' => 'Anjos e Arcanjos: two falls, one river, pools to dive into.',
            ]),
            $this->cue('night-milkyway', 0.14, 0.86, 'center', [
                'titlePt' => 'Amanhecer, luar, um milhão de estrelas.',
                'titleEn' => 'Sunrise, moonrise, a million stars.',
            ]),
            $this->cue('night-moon', 0.14, 0.86, 'center', [
                'bodyPt' => 'O céu da Chapada abre o segundo ato.',
                'bodyEn' => 'Chapada\'s sky opens the second act.',
            ]),
            $this->cue('house', 0.12, 0.88, 'left', [
                'titlePt' => 'Só seu, pelo tempo que quiser.',
                'titleEn' => 'All yours, for as long as you want.',
                'bodyPt' => 'Até 5 hóspedes, ou até 7, com uma cama queen extra, em reserva direta.',
                'bodyEn' => 'Up to 5 guests, or up to 7, with an extra queen bed, when you book directly.',
                'smallPt' => 'Café da manhã artesanal no Kuya Deck, sob pedido.',
                'smallEn' => 'Artisanal breakfast at Kuya Deck, on request.',
                'action' => 'choices',
            ]),
            $this->cue('sleep', 0.14, 0.86, 'left', [
                'titlePt' => 'Durma sob um teto de estrelas.',
                'titleEn' => 'Sleep beneath a ceiling of stars.',
                'bodyPt' => 'Acorde com os sons da mata e a serra inteira na janela.',
                'bodyEn' => 'Wake to forest sounds and the whole ridge in your window.',
            ]),
            $this->cue('cocoon', 0.14, 0.86, 'left', [
                'bodyPt' => 'Quando a noite cai, a luz suave faz do domo um casulo quente.',
                'bodyEn' => 'As night falls, soft light makes the dome a warm cocoon.',
                'action' => 'choices',
            ]),
            $this->cue('pyramid', 0.14, 0.86, 'left', [
                'titlePt' => 'A pirâmide sagrada.',
                'titleEn' => 'The sacred pyramid.',
                'bodyPt' => 'Vitrais, uma cama e o vale inteiro aos seus pés. O quarto mais improvável da Chapada.',
                'bodyEn' => 'Stained glass, a bed and the whole valley at your feet. The most unlikely bedroom in Chapada.',
                'action' => 'choices',
            ]),
            $this->cue('kitchen', 0.14, 0.86, 'right', [
                'titlePt' => 'Cozinhe com a serra à mesa.',
                'titleEn' => 'Cook with the mountains at your table.',
                'bodyPt' => 'Ao ar livre: o café, o jantar, o tempo que você quiser.',
                'bodyEn' => 'In the open air: coffee, dinner, as long as you want.',
                'action' => 'choices',
            ]),
            $this->cue('bath-1', 0.14, 0.86, 'left', [
                'titlePt' => 'Água quente, céu aberto.',
                'titleEn' => 'Hot water, open sky.',
                'bodyPt' => 'Banheiro só seu, espelho dourado, a Chapada olhando de volta.',
                'bodyEn' => 'A bathroom of your own, a golden mirror, Chapada looking back.',
            ]),
            $this->cue('breakfast', 0.14, 0.86, 'right', [
                'titlePt' => 'Café artesanal no Kuya Deck.',
                'titleEn' => 'Artisanal breakfast at Kuya Deck.',
                'bodyPt' => 'Sob pedido, com canto de pássaros e o cerrado acordando.',
                'bodyEn' => 'On request, with birdsong and the cerrado waking up.',
                'action' => 'choices',
            ]),
        ], 'v7/stay-1.jpg', 'v7/stay-1.jpg', true);
    }

    /**
     * @return array<string, mixed>
     */
    public function retiro(): array
    {
        return $this->finish('retiro', [
            $this->frames('retiro1', 7),
            $this->frames('retiro2'),
            $this->frames('retiro3'),
            $this->still('circle', 'v7/retiro-circle.jpg'),
            $this->still('gathering', 'v7/retiro-gathering.jpg'),
            $this->still('book', 'v7/retiro-circle.jpg'),
        ], [
            $this->cue('retiro1', 0, 0.38, 'center', [
                'middle' => true,
                'titlePt' => 'A energia daqui é rara.',
                'titleEn' => 'The energy here is rare.',
                'bodyPt' => 'Feito para o seu Retiro.',
                'bodyEn' => 'Made for your retreat.',
                'action' => 'discover',
                'discoverHref' => '#retiro-energy',
                'discoverPt' => 'Descobrir o Retiro',
                'discoverEn' => 'Discover the retreat',
                'scrubClip' => 'retiro1',
                'scrubLocal' => 0.52,
            ]),
            $this->cue('retiro1', 0.48, 0.9, 'center', [
                'titlePt' => 'Este chão espera o sagrado.',
                'titleEn' => 'This ground awaits the sacred.',
                'bodyPt' => 'Longe do barulho, no silêncio da mata, o domo espera o seu Retiro.',
                'bodyEn' => 'Far from the noise, in the quiet of the forest, the dome waits for your retreat.',
            ]),
            $this->cue('retiro2', 0.16, 0.86, 'right', [
                'titlePt' => 'No meio da mata, no cerrado da Chapada dos Veadeiros.',
                'titleEn' => 'In the heart of the forest, in the cerrado of Chapada dos Veadeiros.',
            ]),
            $this->cue('retiro3', 0.16, 0.86, 'left', [
                'bodyPt' => 'A dez minutos das cachoeiras, o horizonte se abre.',
                'bodyEn' => 'Ten minutes from the waterfalls, the horizon opens.',
            ]),
            $this->cue('circle', 0.14, 0.86, 'left', [
                'titlePt' => 'Traga o seu círculo.',
                'titleEn' => 'Bring your circle.',
                'bodyPt' => 'Cerimônias e encontros, para até 23 pessoas.',
                'bodyEn' => 'Ceremonies and gatherings, for up to 23 people.',
            ]),
            $this->cue('gathering', 0.14, 0.86, 'center', [
                'titlePt' => 'Quando as velas acendem, o céu responde.',
                'titleEn' => 'When the candles are lit, the sky answers.',
                'bodyPt' => 'A Chapada guarda mistérios. Aqui o seu Retiro acontece.',
                'bodyEn' => 'Chapada keeps its mysteries. Here, your retreat takes its place.',
            ]),
            $this->cue('book', 0.12, 0.9, 'center', [
                'titlePt' => 'Somente com reserva prévia, pelo WhatsApp.',
                'titleEn' => 'By prior booking only, on WhatsApp.',
                'bodyPt' => 'Sem álcool. Por favor, não apareça sem agendar.',
                'bodyEn' => 'No alcohol. Please don\'t arrive without booking.',
                'action' => 'retreat',
            ]),
        ], 'v7/retiro-1.jpg', 'v7/retiro-1.jpg', true);
    }

    /**
     * @return array<string, mixed>
     */
    public function jornada(): array
    {
        return $this->finish('jornada', [
            $this->frames('stairs'),
            $this->frames('sign'),
            $this->frames('gate'),
            $this->frames('rajaaram'),
            $this->still('hands', 'v5/journey-1.jpg'),
            $this->still('altar', 'v5/journey-3.jpg'),
            $this->still('massage', 'v5/journey-2.jpg'),
            $this->still('cta', 'posters/08d_dome-mid.jpg'),
        ], [
            $this->cue('stairs', 0, 0.55, 'center', [
                'middle' => true,
                'titlePt' => 'Jornada com Rajaaram',
                'titleEn' => 'Journey with Rajaaram',
                'bodyPt' => 'Cerimônias e massagens, no mesmo chão.',
                'bodyEn' => 'Ceremonies and massages, on the same land.',
                'action' => 'discover',
                'discoverHref' => '#jornada-stairs',
                'discoverPt' => 'Descobrir a jornada',
                'discoverEn' => 'Discover the journey',
                'rajaaram' => true,
                'scrubClip' => 'stairs',
                'scrubLocal' => 0.62,
            ]),
            $this->cue('stairs', 0.6, 0.94, 'right', [
                'titlePt' => 'Desça a colina. Ainda tem mais.',
                'titleEn' => 'Walk down the hill. There\'s still more.',
                'bodyPt' => 'No mesmo chão, o Rajaaram espera.',
                'bodyEn' => 'On the same land, Rajaaram is waiting.',
            ]),
            $this->cue('sign', 0.14, 0.86, 'left', [
                'titlePt' => 'Um espaço de cura, aqui mesmo.',
                'titleEn' => 'A healing space, right here.',
            ]),
            $this->cue('rajaaram', 0.16, 0.88, 'left', [
                'bodyPt' => 'Cerimônias e massagens que atravessam o corpo. Algumas incluem a Estadia no domo.',
                'bodyEn' => 'Ceremonies and massages that go through the body. Some journeys include a stay at the dome.',
            ]),
            $this->cue('hands', 0.14, 0.86, 'left', [
                'titlePt' => 'Quando o corpo pede, o Rajaaram escuta.',
                'titleEn' => 'When your body asks, Rajaaram listens.',
                'bodyPt' => 'Massagens e sessões, com reserva prévia.',
                'bodyEn' => 'Massages and sessions, by prior booking.',
            ]),
            $this->cue('cta', 0.08, 1, 'center', [
                'middle' => true,
                'hold' => true,
                'titlePt' => 'Descubra a jornada.',
                'titleEn' => 'Discover the journey.',
                'bodyPt' => 'Conheça o Rajaaram ou fale com eles direto.',
                'bodyEn' => 'Meet Rajaaram, or talk with them directly.',
                'action' => 'rajaaram',
            ]),
        ], 'posters/08a_stairs-start.jpg', 'posters/08a_stairs-start.jpg', true);
    }

    /**
     * @param list<array<string, mixed>> $clips
     * @param list<array<string, mixed>> $cues
     *
     * @return array<string, mixed>
     */
    private function finish(string $id, array $clips, array $cues, string $veil, ?string $poster = null, bool $stream = false): array
    {
        $this->assignOverlap($clips);
        $timeline = $this->timeline($clips);
        $span = max(1, $timeline['total'] - 1);
        foreach ($cues as &$cue) {
            $index = $timeline['index'][$cue['clip']];
            $start = $timeline['starts'][$index];
            $frames = $clips[$index]['frames'];
            $cue['from'] = round(($start + $cue['localFrom'] * ($frames - 1)) / $span, 5);
            $cue['to'] = round(($start + $cue['localTo'] * ($frames - 1)) / $span, 5);
            $cue['scrub'] = null;
            if (null !== $cue['scrubClip']) {
                $scrubIndex = $timeline['index'][$cue['scrubClip']];
                $scrubStart = $timeline['starts'][$scrubIndex];
                $scrubFrames = $clips[$scrubIndex]['frames'];
                $cue['scrub'] = round(($scrubStart + $cue['scrubLocal'] * ($scrubFrames - 1)) / $span, 5);
            }
            unset($cue['clip'], $cue['localFrom'], $cue['localTo'], $cue['scrubClip'], $cue['scrubLocal']);
        }
        unset($cue);

        $still = $this->media->get($veil);
        $posterUrl = null !== $poster ? $this->media->webp($poster, 828) : null;
        $sequence = [
            'px' => self::PX,
            'clips' => array_map(static function (array $clip): array {
                unset($clip['panSign']);

                return $clip;
            }, $clips),
        ];

        return [
            'id' => $id,
            'px' => self::PX,
            'frames' => $timeline['total'],
            'sequence' => json_encode($sequence, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES),
            'cues' => $cues,
            'lqip' => $still['lqip'],
            'color' => $still['color'],
            'poster' => $posterUrl,
            'stream' => $stream,
        ];
    }

    /**
     * @param list<array<string, mixed>> $clips
     */
    private function assignOverlap(array &$clips): void
    {
        $last = count($clips) - 1;
        foreach ($clips as $i => &$clip) {
            if ($i === $last) {
                $clip['overlap'] = 0;
                continue;
            }
            $clip['overlap'] = min(self::OVERLAP, intdiv((int) $clip['frames'], 3), intdiv((int) $clips[$i + 1]['frames'], 3));
        }
    }

    /**
     * @param list<array<string, mixed>> $clips
     *
     * @return array{starts: list<int>, index: array<string, int>, total: int}
     */
    private function timeline(array $clips): array
    {
        $starts = [];
        $index = [];
        $cursor = 0;
        foreach ($clips as $i => $clip) {
            $starts[] = $cursor;
            $index[$clip['id']] = $i;
            $cursor += (int) $clip['frames'] - (int) $clip['overlap'];
        }

        return ['starts' => $starts, 'index' => $index, 'total' => $cursor];
    }

    /**
     * @return array<string, mixed>
     */
    private function frames(string $id, int $offset = 0): array
    {
        $item = $this->manifest()[$id] ?? null;
        if (!is_array($item)) {
            throw new \RuntimeException(sprintf('Missing frame sequence "%s".', $id));
        }

        $frames = (int) $item['frames'] - $offset;
        if ($frames < 2) {
            throw new \RuntimeException(sprintf('Frame sequence "%s" is too short.', $id));
        }

        $clip = [
            'id' => $id,
            'kind' => 'frames',
            'frames' => $frames,
            'offset' => $offset,
            'm' => $this->packages->getUrl((string) $item['mobile']),
            'd' => $this->packages->getUrl((string) $item['desktop']),
            'overlap' => self::OVERLAP,
        ];
        $small = dirname($this->manifestPath).'/'.$id.'/s';
        $preview = is_dir($small) ? count(glob($small.'/*.webp') ?: []) : 0;
        if ($preview > 0) {
            $clip['s'] = $this->packages->getUrl('media/experience/seq/'.$id.'/s');
            $clip['preview'] = $preview;
        }

        return $clip;
    }

    /**
     * @return array<string, mixed>
     */
    private function still(string $id, string $path): array
    {
        $pan = 0.05 * $this->panSign;
        $this->panSign *= -1;

        return [
            'id' => $id,
            'kind' => 'still',
            'frames' => self::STILL_FRAMES,
            'src' => $this->media->webp($path, 1280),
            'zoom' => 0.16,
            'pan' => $pan,
            'overlap' => self::OVERLAP,
        ];
    }

    /**
     * @param array<string, mixed> $extra
     *
     * @return array<string, mixed>
     */
    private function cue(string $clip, float $from, float $to, string $align, array $extra = []): array
    {
        return array_merge([
            'clip' => $clip,
            'localFrom' => $from,
            'localTo' => $to,
            'align' => $align,
            'hero' => false,
            'middle' => false,
            'hold' => false,
            'view' => false,
            'kickerPt' => null,
            'kickerEn' => null,
            'titlePt' => null,
            'titleEn' => null,
            'bodyPt' => null,
            'bodyEn' => null,
            'smallPt' => null,
            'smallEn' => null,
            'noticePt' => null,
            'noticeEn' => null,
            'action' => null,
            'discoverHref' => null,
            'discoverPt' => null,
            'discoverEn' => null,
            'rajaaram' => false,
            'scrubClip' => null,
            'scrubLocal' => null,
        ], $extra);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function manifest(): array
    {
        static $cached = null;
        if (null !== $cached) {
            return $cached;
        }
        $decoded = json_decode((string) file_get_contents($this->manifestPath), true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Frame manifest is missing.');
        }
        $cached = $decoded;

        return $cached;
    }
}
