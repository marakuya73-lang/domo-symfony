<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\DomCrawler\Crawler;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

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
        self::assertStringContainsString('340 m² de deck, só madeira e horizonte.', $html);
        self::assertStringContainsString('340 m² of deck, just wood and horizon.', $html);
        self::assertStringContainsString('Uma cama queen no domo, outra na pirâmide, e uma de solteiro.', $html);
        self::assertStringContainsString('A queen bed in the dome, another queen bed in the pyramid, and a single bed.', $html);
        self::assertStringNotContainsString('Uma rainha', $html);
        self::assertStringNotContainsString('Trezentos e quarenta metros', $html);
        self::assertStringNotContainsString('noindex', $html);
        $this->assertCanonicalPointsAtHome($client, $crawler);
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
        foreach (['04b', '04c', '10a'] as $still) {
            self::assertSame('38', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-travel'));
            self::assertSame('1', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-brief'));
        }
        self::assertLessThan(100, (int) $crawler->filter('[data-scene="10b"]')->attr('data-travel'));
    }

    public function testPreviewAliasUsesTheSameStory(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/preview');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Sua Pausa Consciente');
        $this->assertCanonicalPointsAtHome($client, $crawler);
    }

    public function testHomepageRendersTheExperience(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Sua Pausa Consciente');
        $this->assertCanonicalPointsAtHome($client, $crawler);
    }

    public function testExperiencePathStillWorksAndCanonicalisesHome(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/experiencia');

        self::assertResponseIsSuccessful();
        $this->assertCanonicalPointsAtHome($client, $crawler);
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

    private function assertCanonicalPointsAtHome(KernelBrowser $client, Crawler $crawler): void
    {
        $expected = $client->getContainer()->get('router')->generate(
            'experience_home',
            [],
            UrlGeneratorInterface::ABSOLUTE_URL,
        );

        self::assertSame($expected, $crawler->filter('link[rel="canonical"]')->attr('href'));
        self::assertStringEndsWith('/', $expected);
    }
}
