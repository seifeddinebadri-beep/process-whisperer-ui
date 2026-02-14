import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Upload, GitBranch, Lightbulb, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockCompanies, mockProcesses, mockUseCases, mockActivityFeed } from "@/data/mockData";

const Overview = () => {
  const navigate = useNavigate();

  const totalCompanies = mockCompanies.length;
  const totalDepartments = mockCompanies.reduce((s, c) => s + c.departments.length, 0);
  const totalProcesses = mockProcesses.length;
  const totalUseCases = mockUseCases.length;

  const statusCounts = {
    uploaded: mockProcesses.filter((p) => p.status === "uploaded").length,
    analyzed: mockProcesses.filter((p) => p.status === "analyzed").length,
    approved: mockProcesses.filter((p) => p.status === "approved").length,
    discovered: mockProcesses.filter((p) => p.status === "discovered").length,
  };

  const stats = [
    { label: "Companies", value: totalCompanies, icon: Building2, color: "text-primary" },
    { label: "Departments", value: totalDepartments, icon: Building2, color: "text-primary" },
    { label: "Processes", value: totalProcesses, icon: GitBranch, color: "text-primary" },
    { label: "Use Cases Found", value: totalUseCases, icon: Lightbulb, color: "text-primary" },
  ];

  const typeIcons: Record<string, string> = {
    upload: "📤",
    approval: "✅",
    discovery: "💡",
    company: "🏢",
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/knowledge-base")} size="sm">
              <Building2 className="mr-1 h-4 w-4" /> Add Company
            </Button>
            <Button onClick={() => navigate("/process-upload")} size="sm" variant="outline">
              <Upload className="mr-1 h-4 w-4" /> Upload Process
            </Button>
            <Button onClick={() => navigate("/automation-discovery")} size="sm" variant="outline">
              <Lightbulb className="mr-1 h-4 w-4" /> View Discoveries
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Process Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["uploaded", "analyzed", "approved", "discovered"] as const).map((stage) => (
              <div key={stage} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{stage}</span>
                  <span className="font-medium">{statusCounts[stage]}</span>
                </div>
                <Progress value={totalProcesses > 0 ? (statusCounts[stage] / totalProcesses) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockActivityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <span className="text-lg leading-none mt-0.5">{typeIcons[item.type]}</span>
                <div className="flex-1">
                  <p className="text-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">{item.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
