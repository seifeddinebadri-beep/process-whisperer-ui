import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { ProcessScreenshot } from "./types";

interface ScreenshotGalleryProps {
  screenshots: ProcessScreenshot[];
  getPublicUrl: (path: string) => string;
}

export const ScreenshotGallery = ({ screenshots, getPublicUrl }: ScreenshotGalleryProps) => {
  const { t } = useLang();
  const [selected, setSelected] = useState<ProcessScreenshot | null>(null);

  if (screenshots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t.analysis.noScreenshots}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.analysis.screenshots}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {screenshots.map((s) => (
              <div
                key={s.id}
                className="group relative cursor-pointer rounded-lg overflow-hidden border bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all"
                onClick={() => setSelected(s)}
              >
                <img
                  src={getPublicUrl(s.filePath)}
                  alt={s.caption || `${t.analysis.page} ${s.pageNumber}`}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                  <div className="flex items-center gap-1">
                    {s.pageNumber != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t.analysis.page} {s.pageNumber}
                      </Badge>
                    )}
                  </div>
                  {s.caption && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl p-2">
          {selected && (
            <div>
              <img
                src={getPublicUrl(selected.filePath)}
                alt={selected.caption || `${t.analysis.page} ${selected.pageNumber}`}
                className="w-full rounded-lg"
              />
              {selected.caption && (
                <p className="text-sm text-muted-foreground mt-2 px-2">{selected.caption}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
