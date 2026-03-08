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

function isPdf(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".pdf");
}

function PdfPagePreview({ url, pageNumber }: { url: string; pageNumber?: number }) {
  const pdfSrc = pageNumber ? `${url}#page=${pageNumber}` : url;
  return (
    <object
      data={pdfSrc}
      type="application/pdf"
      className="w-full h-32 pointer-events-none"
    >
      <div className="w-full h-32 flex items-center justify-center bg-muted text-muted-foreground text-xs">
        PDF p.{pageNumber || "?"}
      </div>
    </object>
  );
}

function PdfPageFull({ url, pageNumber }: { url: string; pageNumber?: number }) {
  const pdfSrc = pageNumber ? `${url}#page=${pageNumber}` : url;
  return (
    <iframe
      src={pdfSrc}
      className="w-full rounded-lg"
      style={{ height: "70vh" }}
      title={`PDF page ${pageNumber || ""}`}
    />
  );
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
            {screenshots.map((s) => {
              const url = getPublicUrl(s.filePath);
              const pdf = isPdf(s.filePath);

              return (
                <div
                  key={s.id}
                  className="group relative cursor-pointer rounded-lg overflow-hidden border bg-muted/30 hover:ring-2 hover:ring-primary/40 transition-all"
                  onClick={() => setSelected(s)}
                >
                  {pdf ? (
                    <PdfPagePreview url={url} pageNumber={s.pageNumber ?? undefined} />
                  ) : (
                    <img
                      src={url}
                      alt={s.caption || `${t.analysis.page} ${s.pageNumber}`}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                    <div className="flex items-center gap-1">
                      {s.pageNumber != null && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t.analysis.page} {s.pageNumber}
                        </Badge>
                      )}
                      {pdf && (
                        <Badge variant="outline" className="text-[10px]">PDF</Badge>
                      )}
                    </div>
                    {s.caption && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.caption}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl p-2">
          {selected && (
            <div>
              {isPdf(selected.filePath) ? (
                <PdfPageFull
                  url={getPublicUrl(selected.filePath)}
                  pageNumber={selected.pageNumber ?? undefined}
                />
              ) : (
                <img
                  src={getPublicUrl(selected.filePath)}
                  alt={selected.caption || `${t.analysis.page} ${selected.pageNumber}`}
                  className="w-full rounded-lg"
                />
              )}
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
