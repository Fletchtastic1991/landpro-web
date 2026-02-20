import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, CheckCircle, Briefcase, TrendingUp, Clock } from "lucide-react";

const stats = [
  { title: "Active Jobs", value: "12", icon: Briefcase, color: "text-blue-600" },
  { title: "Pending Quotes", value: "8", icon: FileText, color: "text-yellow-600" },
  { title: "Completed Jobs", value: "47", icon: CheckCircle, color: "text-green-600" },
  { title: "Total Revenue", value: "$38,450", icon: DollarSign, color: "text-emerald-600" },
];

const recentActivity = [
  { id: 1, action: "Quote approved", client: "Green Acres Property", time: "2 hours ago", icon: CheckCircle },
  { id: 2, action: "New job scheduled", client: "Riverside Estate", time: "4 hours ago", icon: Briefcase },
  { id: 3, action: "Quote sent", client: "Mountain View Ranch", time: "Yesterday", icon: FileText },
  { id: 4, action: "Job completed", client: "Oak Hills Development", time: "2 days ago", icon: CheckCircle },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, John! 👋
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    <activity.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.client}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Scheduling Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Based on your current workload, consider scheduling 3 additional jobs for next week to maximize efficiency.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Quote Follow-up</h4>
              <p className="text-sm text-muted-foreground">
                You have 5 quotes pending for more than 3 days. Following up could increase your conversion rate by 23%.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Revenue Forecast</h4>
              <p className="text-sm text-muted-foreground">
                You're on track to exceed your monthly goal by $4,200 if current trends continue.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
