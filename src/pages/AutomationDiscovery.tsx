import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockUseCases, mockProcesses } from "@/data/mockData";
import { useLang } from "@/lib/i18n";

const potentialColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const AutomationDiscovery = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const approvedProcesses = mockProcesses.filter((p) => p.status === "approved" || p.status === "discovered");

  if (approvedProcesses.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t.discovery.noApproved}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.discovery.title}</h2>
        <p className="text-sm text-muted-foreground">{t.discovery.subtitle}</p>
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" /> {t.discovery.cards}</TabsTrigger>
          <TabsTrigger value="table"><List className="h-4 w-4 mr-1" /> {t.discovery.table}</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {mockUseCases.map((uc) => (
              <Card key={uc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{uc.name}</CardTitle>
                    <Badge className={`text-xs capitalize ${potentialColors[uc.potential]}`}>{t.discovery[uc.potential as "low"|"medium"|"high"]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{uc.description}</p>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="text-xs p-0 h-auto text-primary">{t.discovery.viewDetails}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.discovery.useCase}</TableHead>
                    <TableHead>{t.discovery.description}</TableHead>
                    <TableHead>{t.discovery.potential}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUseCases.map((uc) => (
                    <TableRow key={uc.id} className="cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                      <TableCell className="font-medium text-sm">{uc.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{uc.description}</TableCell>
                      <TableCell><Badge className={`text-xs capitalize ${potentialColors[uc.potential]}`}>{t.discovery[uc.potential as "low"|"medium"|"high"]}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="sm" className="text-xs">{t.discovery.details}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDiscovery;
