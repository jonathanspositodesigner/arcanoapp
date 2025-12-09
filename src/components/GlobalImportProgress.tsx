import { useImportProgress } from "@/hooks/useImportProgress";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";

const GlobalImportProgress = () => {
  const { isImporting, progress, current, total } = useImportProgress();

  if (!isImporting) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 backdrop-blur-sm border-b border-primary/20">
      <div className="container max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          <Upload className="h-4 w-4 text-primary animate-pulse" />
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <span className="text-xs text-primary font-medium whitespace-nowrap">
            Importando CSV: {progress}% ({current}/{total})
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalImportProgress;
