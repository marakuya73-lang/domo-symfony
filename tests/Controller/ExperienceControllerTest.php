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
        self::assertStringContainsString('A melhor vista do mundo', $html);
        self::assertStringContainsString('The best view in the world', $html);
        self::assertStringContainsString('Domo Xangô · A melhor vista do mundo | Chapada dos Veadeiros', $html);
        self::assertStringContainsString('Domo Xangô · The best view in the world | Chapada dos Veadeiros', $html);
        self::assertSame(3, substr_count($html, 'Visitas somente com reserva confirmada. Por favor, não venha sem agendar.'));
        self::assertStringContainsString("Visits by confirmed reservation only. Please don't arrive without booking.", $html);
        self::assertStringContainsString('DOMO GEODÉSICO NA CHAPADA', $html);
        self::assertStringContainsString('Your Conscious Pause', $html);
        self::assertStringContainsString('GEODESIC DOME IN CHAPADA', $html);
        self::assertStringContainsString('A partir de R$ 550/noite', $html);
        self::assertStringContainsString('Check-in 14h–18h', $html);
        self::assertStringContainsString('Check-in 2–6 pm', $html);
        self::assertStringContainsString('Oito metros', $html);
        self::assertStringContainsString('até 7 com cama queen extra', $html);
        self::assertStringContainsString('extra queen bed', $html);
        self::assertStringNotContainsString('Uma rainha', $html);
        self::assertStringContainsString('23', $html);
        self::assertStringContainsString('Anjos e Arcanjos', $html);
        self::assertStringContainsString('TripAdvisor', $html);
        self::assertStringContainsString('The Best View in the World.', $html);
        self::assertStringContainsString('Pular para reservas', $html);
        self::assertStringContainsString('Skip to booking', $html);
        self::assertStringContainsString('prefers-reduced-motion', $html);
        self::assertStringContainsString('340 m² de madeira suspensa sobre o vale.', $html);
        self::assertStringContainsString('340 m² of wood suspended over the valley.', $html);
        self::assertStringNotContainsString('Trezentos e quarenta metros', $html);
        self::assertStringContainsString('Por onde você quer começar?', $html);
        self::assertStringContainsString('Where would you like to begin?', $html);
        self::assertStringContainsString('A vida no domo', $html);
        self::assertStringContainsString('Ver outro canto', $html);
        self::assertStringContainsString('Seguir a jornada', $html);
        self::assertStringContainsString('href="#chapter-dome"', $html);
        self::assertStringContainsString('href="#chapter-bath"', $html);
        self::assertStringContainsString('https://concierge.domoxango.com.br/', $html);
        self::assertStringContainsString('>Concierge<', $html);
        self::assertStringContainsString('data-src="/media/experience/09b_falls_aerial.mp4"', $html);
        self::assertStringContainsString('data-placeholder="bath"', $html);
        self::assertStringNotContainsString('noindex', $html);
        $this->assertCanonicalPointsAtHome($client, $crawler);
        self::assertStringContainsString('https://wa.me/5561998159838?text=', $html);
        self::assertStringContainsString('https://www.airbnb.com/h/domoxango', $html);
        self::assertStringContainsString('+55 61 99815-9838', $html);
        self::assertStringNotContainsString('Silêncio para dois', $html);
        self::assertDoesNotMatchRegularExpression('/<video\b[^>]*\ssrc=/', $html);
        self::assertStringContainsString('data-src="/media/experience/01_hero.mp4"', $html);
        self::assertStringContainsString('data-src="/media/experience/09_falls.mp4"', $html);

        self::assertSame(
            ['01', '02a', '08a', '03a', '04a', '04b', '04c', '03b', '02b', '06', 'bath', 'breakfast', '08b', '08c', '08d', '09', '09b', '10a', 'gatherings', '10b'],
            $crawler->filter('[data-scene]')->extract(['data-scene']),
        );
        foreach (['04b', '04c', '10a', 'bath', 'breakfast', 'gatherings'] as $still) {
            self::assertSame('38', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-travel'));
            self::assertSame('1', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-brief'));
        }
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
            '09b_falls_aerial.mp4',
            '10a_moon.mp4',
            'posters/bath-placeholder.jpg',
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
