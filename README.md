# Domo Xangô

Symfony application that will replace the current Domo Xangô site (domoxango.com.br).

Stack: Symfony 8.1, PHP 8.4+, Twig, Doctrine ORM, AssetMapper.

```bash
composer install
symfony serve
```

The scroll-driven homepage is `/`. `/experiencia` and `/preview` serve the same page and canonicalise to `/`.
Clips and posters are in `public/media/experience/`.
