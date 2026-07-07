import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

interface CautieLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CautieLogo({ size = 'md', className = '' }: CautieLogoProps) {
  if (!SHOW_CAUTIE_LOGO) return null;

  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base';
  const padX = size === 'sm' ? 'px-1.5' : size === 'lg' ? 'px-3' : 'px-2';

  return (
    <span className={`inline-flex items-center ${padX} ${className}`}>
      <span className={`${textSize} tracking-tight lowercase font-medium`}>
        cautie
      </span>
    </span>
  );
}
