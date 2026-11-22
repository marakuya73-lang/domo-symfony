<?php

declare(strict_types=1);

namespace App\Controller;

use App\Experience\ExperienceCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Scroll preview. This does not register a route for /, so the future homepage stays untouched.
 */
final class ExperienceController extends AbstractController
{
    #[Route('/experiencia', name: 'experience_show', methods: ['GET'])]
    #[Route('/preview', name: 'experience_preview', methods: ['GET'])]
    public function __invoke(ExperienceCatalog $catalog): Response
    {
        return $this->render('experience/show.html.twig', [
            'scenes' => $catalog->scenes(),
            'links' => $catalog->links(),
        ]);
    }
}
