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

        self::assertSelectorTextContains('h1', 'Domo Xangô');
        self::assertStringNotContainsString('Sua Pausa Consciente', $html);
        self::assertStringNotContainsString('view-credit', $html);
        self::assertStringContainsString('A melhor vista do mundo', $html);
        self::assertStringContainsString('The best view in the world', $html);
        self::assertStringContainsString('Domo Xangô, a melhor vista do mundo, Chapada dos Veadeiros', $html);
        self::assertStringContainsString('Domo Xangô, the best view in the world, Chapada dos Veadeiros', $html);
        self::assertStringNotContainsString('—', $html);
        self::assertStringNotContainsString('–', $html);
        self::assertStringContainsString('Visitas somente com reserva confirmada. Por favor, não apareça sem agendar.', $html);
        self::assertStringNotContainsString('não venha sem agendar', $html);
        self::assertStringContainsString("Visits by confirmed reservation only. Please don't arrive without booking.", $html);
        self::assertStringContainsString('DOMO GEODÉSICO NA CHAPADA', $html);
        self::assertStringNotContainsString('Your Conscious Pause', $html);
        self::assertStringContainsString('GEODESIC DOME IN CHAPADA', $html);
        self::assertStringContainsString('A partir de R$ 550/noite', $html);
        self::assertStringContainsString('Check-in 14h às 18h', $html);
        self::assertStringContainsString('Check-in 2 to 6 pm', $html);
        self::assertStringNotContainsString('Oito metros', $html);
        self::assertStringNotContainsString('Eight metres', $html);
        self::assertStringContainsString('Geometria sagrada, sozinho diante do vale. Só seu.', $html);
        self::assertStringContainsString('Sacred geometry, alone before the valley. All yours.', $html);
        self::assertStringContainsString('até 7 com cama queen extra', $html);
        self::assertStringContainsString('extra queen bed', $html);
        self::assertStringNotContainsString('Uma rainha', $html);
        self::assertStringContainsString('23', $html);
        self::assertStringContainsString('Anjos e Arcanjos', $html);
        self::assertStringNotContainsString('TripAdvisor', $html);
        self::assertStringContainsString('Pular para reservas', $html);
        self::assertStringContainsString('Skip to booking', $html);
        self::assertStringContainsString('prefers-reduced-motion', $html);
        self::assertStringContainsString('340 m² de madeira suspensa sobre o vale.', $html);
        self::assertStringContainsString('340 m² of wood suspended over the valley.', $html);
        self::assertStringContainsString('O deck é seu. O nascer do sol também.', $html);
        self::assertStringContainsString('The deck is yours. So is the sunrise.', $html);
        self::assertStringContainsString('Ioga ao amanhecer, a lua nascendo à noite, 360° de estrelas.', $html);
        self::assertStringNotContainsString('pôr do sol', $html);
        self::assertStringNotContainsString('sunset', strtolower($html));
        self::assertStringNotContainsString('breakfast-sunset', $html);
        self::assertStringNotContainsString('Trezentos e quarenta metros', $html);
        self::assertStringContainsString('O que você busca?', $html);
        self::assertStringContainsString('What are you looking for?', $html);
        self::assertStringContainsString('Por onde você quer começar?', $html);
        self::assertStringContainsString('Where would you like to begin?', $html);
        self::assertStringContainsString('A vida no domo', $html);
        self::assertStringContainsString('Ver outro canto', $html);
        self::assertStringContainsString('Voltar às escolhas', $html);
        self::assertStringContainsString('Back to choices', $html);
        self::assertStringContainsString('Descobrir o domo', $html);
        self::assertStringContainsString('Discover the dome', $html);
        self::assertStringContainsString('Descobrir retiros', $html);
        self::assertStringNotContainsString('Seguir a jornada', $html);
        self::assertStringContainsString('href="#chapter-dome"', $html);
        self::assertStringContainsString('href="#chapter-bath"', $html);
        self::assertStringContainsString('data-branch="estadia"', $html);
        self::assertStringContainsString('data-branch="retiro"', $html);
        self::assertStringContainsString('data-branch="jornada"', $html);
        self::assertStringContainsString('https://concierge.domoxango.com.br/', $html);
        self::assertStringContainsString('>Concierge<', $html);
        self::assertStringContainsString('data-src="/media/experience/09b_falls_aerial.mp4"', $html);
        self::assertStringContainsString('data-src="/media/experience/v5/path-4498.mp4"', $html);
        self::assertStringNotContainsString('data-placeholder="bath"', $html);
        self::assertStringContainsString('/media/experience/v5/bath-1.jpg', $html);
        self::assertStringContainsString('/media/experience/v5/breakfast-deck.jpg', $html);
        self::assertStringContainsString('/media/experience/v5/night-milkyway.jpg', $html);
        self::assertStringContainsString('/media/experience/v5/night-moon-palms.jpg', $html);
        self::assertStringNotContainsString('/media/experience/v5/breakfast.jpg', $html);
        self::assertStringNotContainsString('retreat-8', $html);
        self::assertStringNotContainsString('4523', $html);
        self::assertStringNotContainsString('noindex', $html);
        $this->assertCanonicalPointsAtHome($client, $crawler);
        self::assertStringContainsString('https://wa.me/5561998159838?text=', $html);
        self::assertStringContainsString('https://www.airbnb.com/h/domoxango', $html);
        self::assertStringContainsString('+55 61 99815-9838', $html);
        self::assertStringContainsString('https://www.rajaaram.com.br', $html);
        self::assertStringContainsString('https://wa.me/5562999932232', $html);
        self::assertStringContainsString('+55 62 99993-2232', $html);
        self::assertStringContainsString('5561998159838', $crawler->filter('a.wa-float')->attr('href'));
        self::assertStringNotContainsString('5562999932232', $crawler->filter('a.wa-float')->attr('href'));
        $jornada = $crawler->filter('#branch-jornada')->html();
        self::assertStringContainsString('08a_stairs.mp4', $jornada);
        self::assertStringContainsString('5562999932232', $jornada);
        self::assertStringNotContainsString('5561998159838', $jornada);
        $retiro = $crawler->filter('#branch-retiro')->html();
        self::assertStringContainsString('5561998159838', $retiro);
        self::assertStringNotContainsString('5562999932232', $retiro);
        self::assertStringContainsString('v7/retiro-1.mp4', $retiro);
        self::assertStringContainsString('v7/retiro-2.mp4', $retiro);
        self::assertStringContainsString('v7/retiro-3.mp4', $retiro);
        self::assertStringContainsString('v7/retiro-circle.jpg', $retiro);
        self::assertStringContainsString('v7/retiro-gathering.jpg', $retiro);
        self::assertStringNotContainsString('v5/retreat-1.jpg', $retiro);
        self::assertStringNotContainsString('9758', $retiro);
        self::assertStringContainsString('até 23 pessoas', $retiro);
        self::assertStringContainsString('Sem álcool', $retiro);
        $story = $crawler->filter('.story')->html();
        self::assertStringContainsString('path-4498.mp4', $story);
        self::assertStringNotContainsString('08a_stairs', $story);
        $hubAt = strpos($html, 'id="hub-break"');
        $reservasAt = strpos($html, 'id="reservas"');
        $branchAt = strpos($html, 'id="branch-estadia"');
        self::assertIsInt($hubAt);
        self::assertLessThan($branchAt, $hubAt);
        self::assertLessThan($reservasAt, $branchAt);
        self::assertStringNotContainsString('Silêncio para dois', $html);
        self::assertStringContainsString('data-src="/media/experience/01_hero.mp4"', $html);
        self::assertStringContainsString('preload="none"', $html);
        self::assertStringContainsString('<canvas class="stage__canvas"', $html);
        self::assertStringContainsString('data-stage="journey"', $html);
        self::assertStringContainsString('data-px="10"', $html);
        $journey = $crawler->filter('[data-stage="journey"]')->attr('data-sequence');
        self::assertStringContainsString('/media/experience/seq/hero/m', $journey);
        self::assertStringContainsString('/media/experience/seq/walk/', $journey);
        self::assertStringContainsString('"frames":192', $journey);
        self::assertStringContainsString('type="image/avif"', $html);
        self::assertStringContainsString('data:image/jpeg;base64,', $html);
        self::assertStringContainsString('fetchpriority="high"', $html);
        self::assertStringNotContainsString('Ampliar', $html);
        self::assertDoesNotMatchRegularExpression('/<video\b[^>]*\sloop[\s>]/', $html);
        self::assertStringContainsString('playsinline', $html);
        self::assertStringContainsString('data-src="/media/experience/09_falls.mp4"', $html);
        $css = (string) file_get_contents(dirname(__DIR__, 2).'/assets/styles/experience.css');
        self::assertStringNotContainsString('scroll-snap-type: y', $css);
        self::assertStringContainsString('position: fixed', $css);
        self::assertStringContainsString('position: sticky', $css);
        self::assertStringContainsString('html.is-scrolly .beats > .scene', $css);
        self::assertStringNotContainsString('"id":"deck"', $crawler->filter('[data-stage="estadia"]')->attr('data-sequence'));
        $order = ['"id":"hero"', '"id":"road"', '"id":"walk"', '"id":"dome"', '"id":"deck"', '"id":"interior"'];
        $at = -1;
        foreach ($order as $token) {
            $next = strpos($journey, $token);
            self::assertNotFalse($next, $token);
            self::assertGreaterThan($at, $next);
            $at = $next;
        }
        $estadia = $crawler->filter('#branch-estadia')->html();
        self::assertStringContainsString('v7/stay-1.mp4', $estadia);
        self::assertStringContainsString('v7/stay-2.mp4', $estadia);
        self::assertLessThan(strpos($estadia, 'v7/stay-2.mp4'), strpos($estadia, 'v7/stay-1.mp4'));

        self::assertSame(
            ['01', '02a', 'path', 'path-pause', '03a'],
            $crawler->filter('.story [data-scene]')->extract(['data-scene']),
        );
        foreach (['04b', '04c', '10a', 'bath-1', 'breakfast', 'night-milkyway', 'night-moon-palms'] as $still) {
            self::assertSame('38', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-travel'));
            self::assertSame('1', $crawler->filter('[data-scene="'.$still.'"]')->attr('data-brief'));
        }
    }

    public function testPreviewAliasUsesTheSameStory(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/preview');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Domo Xangô');
        $this->assertCanonicalPointsAtHome($client, $crawler);
    }

    public function testHomepageRendersTheExperience(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Domo Xangô');
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
            'v5/path-4498.mp4',
            'v5/path-4498.jpg',
            'v5/bath-1.jpg',
            'v5/bath-2.jpg',
            'v5/bath-3.jpg',
            'v5/breakfast-deck.jpg',
            'v5/breakfast-sunset.jpg',
            'v5/night-milkyway.jpg',
            'v5/night-moon-palms.jpg',
            'v5/retreat-1.jpg',
            'v5/journey-1.jpg',
            'v7/stay-1.mp4',
            'v7/stay-2.mp4',
            'v7/stay-1.jpg',
            'v7/retiro-1.mp4',
            'v7/retiro-2.mp4',
            'v7/retiro-3.mp4',
            'v7/retiro-circle.jpg',
            'v7/retiro-gathering.jpg',
            'posters/01_hero-start.jpg',
            'posters/09_falls-mid.jpg',
            'stills/hero_end.jpg',
        ];

        foreach ($files as $file) {
            self::assertFileExists($root.$file, $file);
        }
        self::assertFileDoesNotExist($root.'v5/retreat-8.jpg');
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
