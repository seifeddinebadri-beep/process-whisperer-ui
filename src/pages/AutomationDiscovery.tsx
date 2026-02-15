import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockUseCases, mockProcesses } from "@/data/mockData";

const potentialColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-green-100 text-green-800",
};

const AutomationDiscovery = () => {
  const navigate = useNavigate();
  const approvedProcesses = mockProcesses.filter((p) => p.status === "approved" || p.status === "discovered");

  if (approvedProcesses.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No approved processes yet. Approve an as-is process first to discover automation use cases.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Automation Use Cases</h2>
        <p className="text-sm text-muted-foreground">AI-discovered automation opportunities from approved processes</p>
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" /> Cards</TabsTrigger>
          <TabsTrigger value="table"><List className="h-4 w-4 mr-1" /> Table</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {mockUseCases.map((uc) => (
              <Card key={uc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{uc.name}</CardTitle>
                    <Badge className={`text-xs capitalize ${potentialColors[uc.potential]}`}>{uc.potential}</Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2">{uc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="text-xs p-0 h-auto text-primary">View details →</Button>
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
                    <TableHead>Use Case</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Potential</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUseCases.map((uc) => (
                    <TableRow key={uc.id} className="cursor-pointer" onClick={() => navigate(`/automation-discovery/${uc.id}`)}>
                      <TableCell className="font-medium text-sm">{uc.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{uc.description}</TableCell>
                      <TableCell><Badge className={`text-xs capitalize ${potentialColors[uc.potential]}`}>{uc.potential}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="sm" className="text-xs">Details</Button></TableCell>
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
