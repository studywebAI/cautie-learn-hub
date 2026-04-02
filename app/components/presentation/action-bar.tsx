import { Download, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActionBarProps = {
  onDownload: () => void;
  onExportMicrosoft: () => void;
  onShare: () => void;
  exportingMicrosoft?: boolean;
};

export function ActionBar({
  onDownload,
  onExportMicrosoft,
  onShare,
  exportingMicrosoft = false,
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onDownload}>
        <Download className="mr-2 h-4 w-4" />
        Download .pptx
      </Button>
      <Button variant="outline" onClick={onExportMicrosoft} disabled={exportingMicrosoft}>
        <ExternalLink className="mr-2 h-4 w-4" />
        Export + open Microsoft
      </Button>
      <Button variant="outline" onClick={onShare}>
        <Share2 className="mr-2 h-4 w-4" />
        Share preview
      </Button>
    </div>
  );
}
