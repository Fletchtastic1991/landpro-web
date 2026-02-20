import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";

const initialJobs = {
  scheduled: [
    { id: 1, client: "Green Acres Property", title: "Lawn Maintenance", date: "Mar 15, 2025" },
    { id: 2, client: "Oak Hills", title: "Tree Trimming", date: "Mar 16, 2025" },
  ],
  inProgress: [
    { id: 3, client: "Riverside Estate", title: "Tree Removal", date: "Mar 14, 2025" },
  ],
  completed: [
    { id: 4, client: "Mountain View Ranch", title: "Land Clearing", date: "Mar 10, 2025" },
    { id: 5, client: "Sunset Gardens", title: "Landscape Design", date: "Mar 8, 2025" },
  ],
};

export default function Jobs() {
  const [jobs] = useState(initialJobs);

  const statusColors = {
    scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    inProgress: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-700 border-green-500/20",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your landscaping jobs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Scheduled */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scheduled</span>
              <Badge variant="outline" className={statusColors.scheduled}>
                {jobs.scheduled.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.scheduled.map((job) => (
              <Card
                key={job.id}
                className="p-4 hover:shadow-md transition-shadow cursor-move border-l-4 border-l-blue-500"
              >
                <h4 className="font-semibold mb-2">{job.title}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {job.client}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {job.date}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>In Progress</span>
              <Badge variant="outline" className={statusColors.inProgress}>
                {jobs.inProgress.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.inProgress.map((job) => (
              <Card
                key={job.id}
                className="p-4 hover:shadow-md transition-shadow cursor-move border-l-4 border-l-yellow-500"
              >
                <h4 className="font-semibold mb-2">{job.title}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {job.client}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {job.date}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Completed</span>
              <Badge variant="outline" className={statusColors.completed}>
                {jobs.completed.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.completed.map((job) => (
              <Card
                key={job.id}
                className="p-4 hover:shadow-md transition-shadow cursor-move border-l-4 border-l-green-500"
              >
                <h4 className="font-semibold mb-2">{job.title}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {job.client}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {job.date}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
