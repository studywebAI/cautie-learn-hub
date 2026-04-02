import { Download, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActionBarProps = {
  onDownload: () => void;
  onExportCloud: () => void;
  onShare: () => void;
  exportingCloud?: boolean;
  cloudLabel: string;
};

export function ActionBar({
  onDownload,
  onExportCloud,
  onShare,
  exportingCloud = false,
  cloudLabel,
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onDownload}>
        <Download className="mr-2 h-4 w-4" />
        Download .pptx
      </Button>
      <Button variant="outline" onClick={onExportCloud} disabled={exportingCloud}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {cloudLabel}
      </Button>
      <Button variant="outline" onClick={onShare}>
        <Share2 className="mr-2 h-4 w-4" />
        Share preview
      </Button>
    </div>
  );
}
