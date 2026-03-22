import { CautieLoader } from '@/components/ui/cautie-loader';

export default function MainLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <CautieLoader label="Loading page" sublabel="Syncing class data" size="lg" />
    </div>
  );
}

