<?php

declare(strict_types=1);

namespace App\Controller;

use App\Experience\ExperienceCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The scroll story is the homepage. The earlier preview paths stay available
 * and point their canonical URL at /.
 */
final class ExperienceController extends AbstractController
{
    #[Route('/', name: 'experience_home', methods: ['GET'])]
    #[Route('/experiencia', name: 'experience_show', methods: ['GET'])]
    #[Route('/preview', name: 'experience_preview', methods: ['GET'])]
    public function __invoke(ExperienceCatalog $catalog): Response
    {
        return $this->render('experience/show.html.twig', [
            'beats' => $catalog->beats(),
            'links' => $catalog->links(),
        ]);
    }
}
