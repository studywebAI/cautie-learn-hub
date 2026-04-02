import { PresentationBlueprint, SlideQualityCheck } from '@/lib/presentation/types';

export function validateSlide(input: {
  slideId: string;
  title: string;
  bullets: string[];
}): SlideQualityCheck {
  const issues: string[] = [];
  let score = 100;

  if (!input.title.trim()) {
    issues.push('Missing slide title');
    score -= 30;
  }
  if (input.title.length > 70) {
    issues.push('Title too long');
    score -= 10;
  }
  if (input.bullets.length > 6) {
    issues.push('Too many bullets');
    score -= 20;
  }
  if (input.bullets.some((bullet) => bullet.split(/\s+/).length > 22)) {
    issues.push('Bullet text too long');
    score -= 12;
  }

  return {
    slideId: input.slideId,
    passed: score >= 70,
    score,
    issues,
  };
}

export function scoreBlueprint(blueprint: PresentationBlueprint) {
  const checks = blueprint.slides.map((slide) =>
    validateSlide({
      slideId: slide.id,
      title: slide.heading,
      bullets: slide.bullets,
    })
  );

  const averageScore = checks.length
    ? Math.round(checks.reduce((sum, item) => sum + item.score, 0) / checks.length)
    : 100;
  const totalIssues = checks.reduce((sum, item) => sum + item.issues.length, 0);

  return {
    averageScore,
    totalIssues,
    passed: averageScore >= 75,
    checks,
  };
}
