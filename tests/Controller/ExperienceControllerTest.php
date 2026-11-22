<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ExperienceControllerTest extends WebTestCase
{
    public function testExperiencePageRendersTheApprovedStory(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/experiencia');

        self::assertResponseIsSuccessful();

        $html = (string) $client->getResponse()->getContent();

        self::assertSelectorTextContains('h1', 'Sua Pausa Consciente');
        self::assertStringContainsString('DOMO GEODÉSICO NA CHAPADA', $html);
        self::assertStringContainsString('Your Conscious Pause', $html);
        self::assertStringContainsString('GEODESIC DOME IN THE CHAPADA', $html);
        self::assertStringContainsString('A partir de R$ 550/noite', $html);
        self::assertStringContainsString('Check-in 14h–18h', $html);
        self::assertStringContainsString('8 m', $html);
        self::assertStringContainsString('até 7', $html);
        self::assertStringContainsString('23', $html);
        self::assertStringContainsString('Anjos e Arcanjos', $html);
        self::assertStringContainsString('TripAdvisor', $html);
        self::assertStringContainsString('The Best View in the World.', $html);
        self::assertStringContainsString('Pular para reservas', $html);
        self::assertStringContainsString('Skip to booking', $html);
        self::assertStringContainsString('prefers-reduced-motion', $html);
        self::assertStringContainsString('noindex', $html);
        self::assertStringContainsString('https://wa.me/5561998159838?text=', $html);
        self::assertStringContainsString('https://www.airbnb.com/h/domoxango', $html);
        self::assertStringContainsString('https://rajaaram.com.br', $html);
        self::assertStringContainsString('+55 61 99815-9838', $html);
        self::assertStringNotContainsString('Silêncio para dois', $html);
        self::assertDoesNotMatchRegularExpression('/<video\b[^>]*\ssrc=/', $html);
        self::assertStringContainsString('data-src="/media/experience/01_hero.mp4"', $html);
        self::assertStringContainsString('data-src="/media/experience/09_falls.mp4"', $html);
        self::assertStringContainsString('data-src="/media/experience/10b_end.mp4"', $html);

        self::assertSame(
            ['01', '02a', '02b', '03a', '03b', '04a', '04b', '04c', '06', '08a', '08b', '08c', '08d', '09', '10a', '10b'],
            $crawler->filter('[data-scene]')->extract(['data-scene']),
        );
    }

    public function testPreviewAliasUsesTheSameStory(): void
    {
        $client = static::createClient();
        $client->request('GET', '/preview');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Sua Pausa Consciente');
    }

    public function testHomepageIsNotReplacedByThePreview(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        self::assertResponseStatusCodeSame(404);
        self::assertStringNotContainsString(
            'Sua Pausa Consciente',
            (string) $client->getResponse()->getContent(),
        );
    }

    public function testShippedClipsAndPostersExist(): void
    {
        $root = dirname(__DIR__, 2).'/public/media/experience/';
        $files = [
            '01_hero.mp4',
            '02a_hill.mp4',
            '02b_pyramid.mp4',
            '03a_orbit.mp4',
            '03b_view.mp4',
            '04a_enter.mp4',
            '04b_5005.mp4',
            '04c_5004.mp4',
            '06_kitchen.mp4',
            '08a_stairs.mp4',
            '08b_sign.mp4',
            '08c_gate.mp4',
            '08d_dome.mp4',
            '09_falls.mp4',
            '10a_moon.mp4',
            '10b_end.mp4',
            'posters/01_hero-start.jpg',
            'posters/09_falls-mid.jpg',
            'stills/hero_end.jpg',
        ];

        foreach ($files as $file) {
            self::assertFileExists($root.$file, $file);
        }
    }
}
